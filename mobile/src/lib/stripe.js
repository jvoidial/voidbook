// Stripe is optional: the app must still run when no publishable key is
// configured (development builds, CI, a fork). When the key is absent the app
// skips StripeProvider rather than mounting it with an invalid key, and the
// purchase flows report that payments are not configured instead of granting an
// entitlement they cannot verify.
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
export const stripeEnabled = STRIPE_PUBLISHABLE_KEY.length > 0;
