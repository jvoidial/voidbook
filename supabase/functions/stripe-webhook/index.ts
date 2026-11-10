// Supabase Edge Function: stripe-webhook
//
// Grants the Premium entitlement when Stripe reports a PaymentIntent succeeded.
//
// This is the robustness net behind the client's `action: 'confirm'` call. That
// call covers the normal path, but if the app is closed, crashes, or loses
// network between Stripe charging the card and the client confirming, the
// entitlement would never be granted. Stripe retries this endpoint, so the grant
// happens anyway.
//
// Deploy:
//   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// `--no-verify-jwt` is required and safe here, and is the opposite of what
// create-payment-intent needs. Stripe cannot send a Supabase JWT, so the
// platform-level check would reject every delivery. Authentication is Stripe's
// signature instead: `constructEventAsync` proves the payload was signed with
// STRIPE_WEBHOOK_SECRET, which never leaves the server. Do NOT add this flag to
// create-payment-intent, which identifies the caller from the JWT.
//
// Stripe dashboard → Developers → Webhooks → add endpoint:
//   URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//   Events: payment_intent.succeeded

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@16?target=deno';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Only this product grants Premium. The product name is written into the intent
// metadata by create-payment-intent, server side, so it cannot be set by a client.
const PREMIUM_PRODUCT = 'sqawk_premium';

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  // 500 rather than 400: this is our misconfiguration, and a 500 makes Stripe
  // retry, so the event is not lost while the secret is being fixed.
  if (!secret) return json({ error: 'server_misconfigured', detail: 'STRIPE_SECRET_KEY not set' }, 500);
  if (!webhookSecret) return json({ error: 'server_misconfigured', detail: 'STRIPE_WEBHOOK_SECRET not set' }, 500);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return json({ error: 'missing_signature' }, 400);

  // The signature covers the exact bytes Stripe sent, so the body must be read as
  // text and verified before it is parsed. Parsing first would let a tampered
  // payload through whenever JSON happened to be valid.
  const rawBody = await req.text();

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (e) {
    // Unsigned or wrongly-signed payload: not from Stripe. 400 is correct, and
    // Stripe will not retry, because a genuine delivery always verifies.
    return json({ error: 'invalid_signature', detail: String((e as Error)?.message || e) }, 400);
  }

  // Acknowledge everything else immediately. Stripe treats any non-2xx as a
  // failed delivery and retries, so unknown types must not error.
  if (event.type !== 'payment_intent.succeeded') {
    return json({ received: true, ignored: event.type });
  }

  const intent = event.data.object as Stripe.PaymentIntent;

  // Only a Premium purchase grants the entitlement; a $1 listing charge is
  // acknowledged and dropped.
  if (intent.metadata?.product !== PREMIUM_PRODUCT) {
    return json({ received: true, ignored: 'not_premium', product: intent.metadata?.product ?? null });
  }

  const userId = intent.metadata?.supabase_user_id;
  if (!userId) {
    // Nothing we can do without a user to grant to. 200 stops Stripe retrying an
    // event that will never become grantable.
    return json({ received: true, ignored: 'no_user' });
  }

  const admin = serviceClient();
  if (!admin) return json({ error: 'server_misconfigured', detail: 'SUPABASE_SERVICE_ROLE_KEY not set' }, 500);

  // `premium_purchases.payment_intent_id` is the primary key, so a retried
  // delivery is a no-op rather than a second grant. The function returns false
  // when the row already existed.
  const { data, error } = await admin.rpc('grant_premium_entitlement', {
    p_user_id: userId,
    p_payment_intent_id: intent.id,
    p_amount: intent.amount,
    p_currency: intent.currency,
  });
  if (error) {
    // 500 so Stripe retries; the grant is idempotent, so a retry is safe.
    return json({ error: 'grant_failed', detail: error.message }, 500);
  }

  return json({ received: true, premium: true, alreadyGranted: data === false });
});
