// Stripe is optional: the app must still run when no publishable key is
// configured (development builds, CI, a fork). When the key is absent the
// Premium flow falls back to the `activate_premium` RPC instead of mounting the
// native provider with an invalid key.
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
export const stripeEnabled = STRIPE_PUBLISHABLE_KEY.length > 0;
