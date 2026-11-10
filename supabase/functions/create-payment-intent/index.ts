// Supabase Edge Function: create-payment-intent
//
// Creates (or reuses) a Stripe Customer for the signed-in caller and returns a
// PaymentIntent client secret for the Premium subscription. The Stripe secret
// key never reaches the client: it lives here as the STRIPE_SECRET_KEY secret.
//
// Deploy:
//   supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
//   supabase functions deploy create-payment-intent
//
// Request  (POST, Authorization: Bearer <supabase access token>):
//   { "product": "sqawk_premium" }        // optional; defaults to sqawk_premium
//   { "product": "business_listing" }     // $1 business listing fee
//   amount/currency are decided here, not by the client
//
//   { "action": "confirm", "paymentIntentId": "pi_..." }
//   Verifies the intent with Stripe and grants the Premium entitlement. The
//   client cannot grant it any other way: `grant_premium_entitlement` is
//   revoked from every client role and needs the service role key.
// Response:
//   { "clientSecret": "pi_..._secret_...", "ephemeralKey": "...",
//     "customer": "cus_...", "publishableKey": "pk_...", "paymentIntentId": "pi_..." }
//   { "premium": true }                   // confirm action
//
// The client passes clientSecret/ephemeralKey/customer to `initPaymentSheet`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@16?target=deno';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Prices live server side on purpose: a client-supplied amount would let anyone
// buy Premium (or list a business) for 1 cent.
const PRODUCTS = {
  sqawk_premium: { amount: 800, currency: 'usd' },
  business_listing: { amount: 100, currency: 'usd' },
};

// A service-role client, used only to grant the Premium entitlement after Stripe
// confirms the charge. The key is a function secret and never leaves the server.
function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Verifies a completed PaymentIntent. For Premium it also grants the
// entitlement; for any other product it only confirms the charge.
//
// This is the only path to `is_premium = true`. Every check is server side: the
// intent must exist, be paid, and belong to the caller, and its product must
// match the one being confirmed. The client's only input is the intent id,
// which on its own grants nothing.
async function confirmPayment({ stripe, user, paymentIntentId, product }) {
  if (!paymentIntentId) return json({ error: 'missing_payment_intent' }, 400);

  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
  } catch (e) {
    return json({ error: 'payment_intent_not_found', detail: String((e as Error)?.message || e) }, 404);
  }

  // A succeeded intent is the proof of payment. `processing` is not enough.
  if (intent.status !== 'succeeded') {
    return json({ error: 'payment_not_completed', status: intent.status }, 402);
  }

  // Tie the charge to this user, so someone else's intent id is useless here.
  if (intent.metadata?.supabase_user_id !== user.id) {
    return json({ error: 'payment_not_yours' }, 403);
  }

  // The product on the intent must be the one being confirmed, so a $1 listing
  // cannot be replayed into an $8 Premium entitlement.
  const intentProduct = intent.metadata?.product;
  if (product && intentProduct !== product) {
    return json({ error: 'wrong_product', product: intentProduct ?? null }, 400);
  }

  // Only a Premium purchase grants the entitlement.
  if (intentProduct !== 'sqawk_premium') {
    return json({ verified: true });
  }

  const admin = serviceClient();
  if (!admin) return json({ error: 'server_misconfigured', detail: 'SUPABASE_SERVICE_ROLE_KEY not set' }, 500);

  const { data, error } = await admin.rpc('grant_premium_entitlement', {
    p_user_id: user.id,
    p_payment_intent_id: intent.id,
    p_amount: intent.amount,
    p_currency: intent.currency,
  });
  if (error) return json({ error: 'grant_failed', detail: error.message }, 500);

  return json({ premium: true, alreadyGranted: data === false });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret) return json({ error: 'server_misconfigured', detail: 'STRIPE_SECRET_KEY not set' }, 500);

  // Read the body once. `action: 'confirm'` means "verify a completed payment
  // and grant Premium"; anything else means "create a PaymentIntent".
  const body = await req.json().catch(() => ({}));
  const action = body?.action ? String(body.action) : 'create';

  // The client names a product; the price is looked up here. Unknown names are
  // rejected rather than defaulted, so a typo can never charge the wrong price.
  let product = 'sqawk_premium';
  if (body?.product) product = String(body.product);

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

  // Identify the caller from their Supabase JWT so the Stripe customer is tied
  // to a real user rather than being trusted from the request body.
  const authHeader = req.headers.get('Authorization') || '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'not_authenticated' }, 401);

  if (action === 'confirm') {
    return confirmPayment({ stripe, user, paymentIntentId: body?.paymentIntentId, product: body?.product ? product : null });
  }

  const price = PRODUCTS[product];
  if (!price) return json({ error: 'unknown_product', detail: product }, 400);

  try {
    // Reuse the customer across purchases; search by the metadata we set, since
    // the id is not stored on the profile.
    const existing = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-06-20' },
    );

    const intent = await stripe.paymentIntents.create({
      amount: price.amount,
      currency: price.currency,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: { supabase_user_id: user.id, product },
    });

    return json({
      clientSecret: intent.client_secret,
      // Returned so the client can ask us to confirm and grant Premium once the
      // sheet reports success; the id alone grants nothing.
      paymentIntentId: intent.id,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? null,
    });
  } catch (e) {
    return json({ error: 'stripe_request_failed', detail: String((e as Error)?.message || e) }, 502);
  }
});
