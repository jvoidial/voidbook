#!/usr/bin/env bash
#
# finalize-production.sh — put SQWAK.app into production payments mode.
#
# Run this from a clone of jvoidial/voidbook, on the machine where you are
# logged into the Supabase CLI and the GitHub CLI. In Termux:
#
#   git pull
#   bash finalize-production.sh
#
# It does five things:
#   1. Stores the Stripe secret key on Supabase (Edge Function secret).
#   2. Applies the database migration that gates Premium behind a real payment.
#   3. Deploys the create-payment-intent Edge Function.
#   4. Stores the Stripe publishable key as a GitHub Actions secret.
#   5. Triggers a fresh Android build that bakes the key into the app.
#
# Nothing secret is written to disk beyond a temporary env file that is shredded
# on exit. The keys are read with hidden prompts, so they never land in your
# shell history or in `ps` output.

set -euo pipefail

REPO="jvoidial/voidbook"
WORKFLOW="android-build.yml"
BRANCH="main"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
die()  { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# ── Temporary env file, removed no matter how we exit ──────────────
ENVFILE="$(mktemp "${TMPDIR:-/tmp}/sqawk-secrets.XXXXXX")"
chmod 600 "$ENVFILE"
cleanup() {
  # Overwrite before unlinking so the bytes are not left in free space.
  if [ -f "$ENVFILE" ]; then
    dd if=/dev/urandom of="$ENVFILE" bs=1024 count=1 conv=notrunc >/dev/null 2>&1 || true
    rm -f "$ENVFILE"
  fi
}
trap cleanup EXIT INT TERM

# ── 0. Preflight ───────────────────────────────────────────────────
say "Checking tools…"
command -v supabase >/dev/null || die "Supabase CLI not found. Install it: https://supabase.com/docs/guides/cli"
command -v gh       >/dev/null || die "GitHub CLI (gh) not found. Install it: https://cli.github.com"
command -v git      >/dev/null || die "git not found."

[ -f supabase/functions/create-payment-intent/index.ts ] \
  || die "Run this from the repository root (supabase/functions/... not found)."

if ! supabase projects list >/dev/null 2>&1; then
  die "Not logged into the Supabase CLI. Run 'supabase login' first, then re-run this script."
fi
if ! gh auth status >/dev/null 2>&1; then
  die "Not logged into the GitHub CLI. Run 'gh auth login' first, then re-run this script."
fi

# Make sure the latest code (with the payment gating) is present.
say "Updating repository…"
git pull --ff-only || warn "git pull failed; continuing with the current checkout."

# ── 1. Link the Supabase project (if not already) ──────────────────
if [ -f supabase/.temp/project-ref ]; then
  PROJECT_REF="$(cat supabase/.temp/project-ref)"
  say "Using linked Supabase project: $PROJECT_REF"
else
  say "Supabase project reference"
  printf 'Find it in your Supabase URL (https://supabase.com/dashboard/project/<REF>).\n'
  read -r -p 'Project ref: ' PROJECT_REF
  [ -n "$PROJECT_REF" ] || die "No project ref given."
  supabase link --project-ref "$PROJECT_REF"
fi

# ── 2. Collect the keys (hidden input) ─────────────────────────────
say "Stripe secret key"
printf 'Paste your Stripe SECRET key (starts sk_live_ or sk_test_). Input is hidden.\n'
read -rs -p 'STRIPE_SECRET_KEY: ' STRIPE_SECRET_KEY; echo
[ -n "$STRIPE_SECRET_KEY" ] || die "No secret key given."

case "$STRIPE_SECRET_KEY" in
  sk_live_*|sk_test_*) : ;;
  *) warn "That does not look like a Stripe secret key (expected sk_live_/sk_test_)." ;;
esac

say "Stripe publishable key"
printf 'Paste your Stripe PUBLISHABLE key (starts pk_live_ or pk_test_). Input is hidden.\n'
read -rs -p 'STRIPE_PUBLISHABLE_KEY: ' STRIPE_PUBLISHABLE_KEY; echo
[ -n "$STRIPE_PUBLISHABLE_KEY" ] || die "No publishable key given."

# Build the env file the Supabase CLI reads. Kept to 600 and shredded on exit.
{
  printf 'STRIPE_SECRET_KEY=%s\n' "$STRIPE_SECRET_KEY"
  printf 'STRIPE_PUBLISHABLE_KEY=%s\n' "$STRIPE_PUBLISHABLE_KEY"
} > "$ENVFILE"

# ── 3. Store the Edge Function secrets ─────────────────────────────
say "Setting Supabase Edge Function secrets…"
supabase secrets set --env-file "$ENVFILE"
# Drop the copies we no longer need from this shell's memory.
STRIPE_SECRET_KEY=''; STRIPE_PUBLISHABLE_KEY=''

# ── 4. Apply the database migration ────────────────────────────────
# Migration 010 removes the old activate_premium RPC, which let any signed-in
# user grant themselves Premium for free, and adds grant_premium_entitlement,
# which only the Edge Function's service role can call.
say "Applying database migrations…"
supabase db push

# ── 5. Deploy the Edge Function ────────────────────────────────────
say "Deploying create-payment-intent…"
supabase functions deploy create-payment-intent

# ── 6. Store the publishable key for the app build ─────────────────
# The key is compiled into the JS bundle, so CI needs it at build time. The
# value goes in over stdin, not as an argument, so it never shows up in `ps`.
say "Setting GitHub Actions secret…"
printf '%s' "$(sed -n 's/^STRIPE_PUBLISHABLE_KEY=//p' "$ENVFILE")" \
  | gh secret set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --repo "$REPO"

# ── 7. Trigger a fresh build ───────────────────────────────────────
# A new build is needed because the publishable key is baked in at bundle time.
# This dispatches the workflow directly: the workflow only runs on pushes that
# touch mobile/**, so an empty commit would be filtered out and do nothing.
say "Triggering a fresh Android build…"
gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$BRANCH"

say "Done."
cat <<'EOF'
What happens next:
  * The Android build runs at:
      https://github.com/jvoidial/voidbook/actions
    It takes ~10 minutes and publishes a new release with the APK.
  * Once it finishes, install that APK. Premium and the $1 business listing
    will charge real cards through Stripe.

Verify at any time (no secret values are shown):
  supabase secrets list
  gh secret list --repo jvoidial/voidbook

To test safely first, use Stripe TEST keys (sk_test_/pk_test_) and card
4242 4242 4242 4242, then re-run this script with your live keys.
EOF
