import { supabase } from './supabase';
import { stripeEnabled } from './stripe';

// Shared Stripe PaymentSheet flow for any server-priced product.
//
// Returns `{ paid: true }` when the payment succeeded and `{ paid: false }` when
// the user cancelled (not an error). Throws only on a real failure. When Stripe
// is not configured the caller gets `{ paid: false, skipped: true }` so the
// feature still works in builds without a publishable key.
export async function payForProduct({ product, initPaymentSheet, presentPaymentSheet }) {
  if (!stripeEnabled || !initPaymentSheet || !presentPaymentSheet) {
    return { paid: false, skipped: true };
  }

  // The amount is chosen server side from the product name.
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { product },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.detail || data.error);

  const init = await initPaymentSheet({
    merchantDisplayName: 'sqawk',
    paymentIntentClientSecret: data.clientSecret,
    customerId: data.customer,
    customerEphemeralKeySecret: data.ephemeralKey,
    allowsDelayedPaymentMethods: false,
  });
  if (init.error) throw new Error(init.error.message);

  const presented = await presentPaymentSheet();
  if (presented.error) {
    if (presented.error.code === 'Canceled') return { paid: false };
    throw new Error(presented.error.message);
  }
  return { paid: true };
}
