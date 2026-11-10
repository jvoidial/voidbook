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
//   { }                        // amount/currency are decided here, not by the client
// Response:
//   { "clientSecret": "pi_..._secret_...", "ephemeralKey": "...",
//     "customer": "cus_...", "publishableKey": "pk_..." }
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

// Price of sqawk Premium, in the smallest currency unit (cents). Kept server
// side on purpose: a client-supplied amount would let anyone buy Premium for 1c.
const PREMIUM_AMOUNT = 800;
const PREMIUM_CURRENCY = 'usd';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret) return json({ error: 'server_misconfigured', detail: 'STRIPE_SECRET_KEY not set' }, 500);

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
      amount: PREMIUM_AMOUNT,
      currency: PREMIUM_CURRENCY,
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      metadata: { supabase_user_id: user.id, product: 'sqawk_premium' },
    });

    return json({
      clientSecret: intent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? null,
    });
  } catch (e) {
    return json({ error: 'stripe_request_failed', detail: String((e as Error)?.message || e) }, 502);
  }
});
