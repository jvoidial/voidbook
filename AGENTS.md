# AGENTS.md — sqawk

Expo 51 / React Native Android app + Supabase backend. Hosted at `github.com/jvoidial/voidbook` (the GitHub path keeps its historical name; the product is sqawk).
The app ships as **sqawk**, a strict black-and-white social client.

## Layout

- `mobile/` — the app. `mobile/src/` holds `screens/`, `components/`, `context/`, `lib/`.
- `mobile/src/screens/auth/` — Welcome, SignIn, SignUp, ResetPassword.
- `supabase/migrations/` — numbered, idempotent SQL. Apply in order in the SQL editor.
- `supabase/functions/daily-token/` — Deno edge function that mints Daily.co room
  tokens. Deploy with `supabase functions deploy daily-token` after
  `supabase secrets set DAILY_API_KEY=...`.
- `supabase/functions/create-payment-intent/` — Deno edge function that creates a
  Stripe Customer + PaymentIntent for Premium. Deploy with
  `supabase functions deploy create-payment-intent` after
  `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_PUBLISHABLE_KEY=...`.
- `supabase/tests/` — a reproducible Postgres + PostgREST harness. `./supabase/tests/run.sh`
  applies every migration, runs the RLS tests and the supabase-js e2e. Needs Docker.
- `.github/workflows/android-build.yml` — release APK on push to `main` (paths: `mobile/**`).
- `.github/workflows/ios-build.yml` — unsigned `.ipa` for sideloading on push to
  `main` (paths: `mobile/**`). Builds with `CODE_SIGNING_ALLOWED=NO` and packages
  `Payload/` into a zip renamed `.ipa`, so it needs no Apple account or secrets and
  no longer skips itself when signing secrets are absent. The sideloading tool
  signs it at install time; see `docs/SIDELOADING.md`.

## Release tags must not use `github.run_number`

`github.run_number` counts **per workflow**, so it resets to 1 whenever a workflow
is split, renamed or added. That made the release step re-publish the existing
`v1.0.1` release and clobber its asset instead of creating a new one — the APK
looked missing from the Releases tab even though the build succeeded.

Both workflows now derive the next tag from the tags that already exist:

```bash
latest=$(git ls-remote --tags --refs origin 'v1.0.*' \
  | sed 's#.*refs/tags/v1.0\.##' | grep -E '^[0-9]+$' | sort -n | tail -1)
echo "tag=v1.0.$(( ${latest:-0} + 1 ))" >> "$GITHUB_OUTPUT"
```

Keep the `if: github.ref == 'refs/heads/main'` guard on the release step: without
it a `workflow_dispatch` on a feature branch would publish a release.

## PostgREST embeds need a disambiguation hint

`posts` reaches `profiles` by two paths — the direct `author_id` FK **and** a
many-to-many path through `likes`/`bookmarks`/`reposts` — so
`.select('*, author:profiles(*)')` fails the whole query with
`PGRST201 (Could not embed because more than one relationship was found)`.
Always name the column or constraint:

```js
supabase.from('posts').select('*, author:profiles!author_id(*)')
```

The same trap breaks `SearchScreen` and the feed; a failed embed returns
`{ data: null, error }` rather than throwing, so it reads as "no posts" /
"Unknown" instead of an error.

## Realtime only delivers the changed row

A `postgres_changes` payload contains the inserted row, nothing else. When a
message arrives for a conversation the client has never loaded (a brand new
chat), there is no conversation to append it to, so `AppContext` refetches that
conversation by id before inserting. RLS makes this safe: a non-participant's
fetch returns nothing and the message is dropped.

## Stripe is optional to build, but Premium needs a payment to unlock

`src/lib/stripe.js` reads `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`. With no key the
app skips `StripeProvider` and the purchase flows say payments are not
configured — they do **not** grant an entitlement they cannot verify. The
`@stripe/stripe-react-native` config plugin must be passed `{}` — a bare string
crashes it on `props.merchantIdentifier`. Both build workflows pass
`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` into the job env so the key is baked into
the bundle at build time; without that the shipped APK has no Stripe.

`src/lib/payments.js` holds the one PaymentSheet flow, shared by Premium and the
$1 business listing. `useStripe()` is context-free (it only wraps native
functions), so calling it outside `StripeProvider` is safe — it returns usable
methods and `payForProduct` short-circuits on the missing key instead.

Product prices live in the `create-payment-intent` edge function's `PRODUCTS`
table, never in the client: `{ product: 'business_listing' }` is a name, not an
amount, so a tampered request cannot buy Premium for a cent.

## Premium is granted only by a verified payment

There is exactly one path to `is_premium = true`, and it runs on the server:

1. The client calls `create-payment-intent` with a product name.
2. Stripe's sheet collects the card; the client gets back a PaymentIntent id.
3. The client calls the same function with `{ action: 'confirm', paymentIntentId }`.
4. The function retrieves the intent from Stripe and checks it is `succeeded`,
   that its `supabase_user_id` metadata is the caller, and that its `product` is
   `sqawk_premium`. Only then does it call `grant_premium_entitlement` with the
   service role key.

`grant_premium_entitlement` has `EXECUTE` revoked from `anon` and
`authenticated`, so PostgREST cannot reach it — otherwise it would be as open as
the RPC it replaced. `premium_purchases.payment_intent_id` is the primary key, so
a replayed confirm is a no-op rather than a second grant.

This closed a real hole: migration 009 shipped `activate_premium()`, which
granted Premium to any signed-in caller with no payment at all. Migration 010
drops it. Do not reintroduce a client-callable entitlement grant.

## Production setup

`finalize-production.sh` is the operator script: it stores the Stripe secrets,
applies migrations, deploys the edge function, sets the Actions secret and
dispatches a build. It dispatches `workflow_dispatch` rather than pushing an
empty commit, because both workflows filter on `paths: mobile/**` and an empty
commit would not match.

## Android package name is frozen

`mobile/app.json` → `android.package` and `ios.bundleIdentifier` must stay
`com.voidial.voidbook`. Changing it breaks in-place updates for existing
installs (Android rejects a differently-signed/signed-differently package as an
update; iOS treats it as a new app). The **display** name is `SQWAK.app`; only
the identifier is locked. Do not "clean up" the identifier to match the brand.

## Validation: do not trust a syntax check

`esbuild` only proves a file *parses*. It does not resolve imports, so a bad
relative path (`../context/X` from inside `screens/auth/`) passes esbuild and
then fails the CI release bundle with
`Unable to resolve module ...`. That exact mistake broke a build once.

Before pushing, run the real bundler — this is the same step CI runs:

```bash
cd mobile && npx expo export --platform android --output-dir /tmp/expout && rm -rf /tmp/expout
```

For a fast check while editing, resolve every import specifier against the
filesystem (relative -> real file, bare -> `node_modules/<pkg>` exists).

## Supabase conventions

- **RLS cannot restrict columns.** A policy of `using (auth.uid() = id)` lets a
  user write *every* column of their own row. Privilege columns (`is_admin`,
  `is_verified`, `is_premium`) are therefore protected by a `BEFORE INSERT OR
  UPDATE` trigger that rejects changes unless the caller is already an admin or
  the write comes from a trusted context (`auth.uid() is null`, i.e. service
  role / SQL editor). See `006_premium_and_admin.sql`.
  - Guard **INSERT as well as UPDATE**. `profiles_insert_self` is
    `with check (auth.uid() = id)`, so a user whose row is missing can insert a
    replacement, and `insert .. on conflict do update` (an upsert) reaches both
    paths. A guard on UPDATE alone leaves those open.
  - Guard **every** column the UI trusts. `verified` predates `is_verified` and
    is still read by the badge; omitting it allows self-verification through
    `update({ verified: true })`.
- **Test trigger logic against a real Postgres, not by reading it.** The guard
  has been exercised with `docker run postgres:16-alpine` plus a small harness
  that recreates the `auth` schema, `auth.uid()` and the RLS policies, then runs
  the actual migration and an attack matrix as the `authenticated` role. Run the
  matrix against both the old and new migration: a green test proves nothing
  unless it fails on the unfixed version.
- Inside a `SECURITY DEFINER` function, `current_user` is the function **owner**,
  not the caller. Never use it to decide whether a caller is trusted — the test
  always passes. Use `auth.uid()`.
- Cross-user writes that RLS forbids (e.g. an admin verifying someone) go through
  a narrow `SECURITY DEFINER` RPC that re-checks authorisation inside itself.
  Example: `admin_set_verified`.
- Deep links: `detectSessionInUrl` is `false` in `lib/supabase.js`, so the SDK
  never raises its own `PASSWORD_RECOVERY` event. Detect recovery from
  `type=recovery` on the incoming URL instead (`parseAuthUrl` in `AuthContext`).
- `profiles.verified` predates `is_verified`. The UI reads both via
  `components/BlueCheck.js` so a badge cannot vanish when one column lags.
- Notifications are produced by **database triggers** (`007_notifications.sql`),
  not by the app. A trigger fires for every writer and cannot be skipped by a
  client that forgets to call it. Any new notifiable action needs a trigger here
  as well as a `kind` string the UI knows.
- Those trigger functions must be `SECURITY DEFINER`: `notif_own` is
  `using (auth.uid() = user_id)`, so the acting user cannot insert a row owned
  by the recipient. Each one also swallows its own errors, because a failed
  notification must never roll back the like/comment/follow that caused it.
- `notifications.target_id` is polymorphic: for `like`/`comment` it holds the
  **post** id, for `follow` it holds the **follower** id. The UI must branch on
  `kind` before using it as a navigation target.
- **Counters are derived, not columns.** `likes`, `shares` and comment counts are
  computed on the client by counting rows in `likes`/`reposts`/`comments`. The
  `posts.likes` and `posts.shares` columns are legacy and may be stale, so never
  render them directly, and never spread a whole `posts` row over a client post
  in the Realtime `UPDATE` handler (it would clobber the real counts).
- **A user action lives in a table keyed by that user**, never as a write to
  someone else's row. `posts_update_self` is `using (auth.uid() = author_id)`, so
  the old "Echo" (which did `update posts set shares = shares + 1`) was silently
  rejected by RLS on any post you did not author. Echo is now a row in `reposts`
  (migration `008`), with a `SECURITY DEFINER` trigger keeping `posts.shares` in
  step. Model any new toggle the same way.
  - **Local / Marketplace tables** live in `009`. `businesses`, `communities` and
    `marketplace_listings` are all owner-scoped: `select` is public, writes are
    `auth.uid() = owner_id` (or `provider_id` for listings). The client embeds the
    provider with `select('*, provider:profiles(*)')`, so the FK must be named
    `provider_id` for that alias to resolve.
  - **`activate_premium()` is the only self-service privilege path.** The
    `protect_profile_privileges` guard rejects `is_premium` writes even from a
    `SECURITY DEFINER` function, because `auth.uid()` still returns the caller
    inside it. The RPC sets a transaction-local GUC (`app.allow_privilege_change`)
    that the guard honours. A client cannot set that GUC through PostgREST, so the
    column stays read-only everywhere else. Any future self-service entitlement
    must use the same escape hatch, not a looser guard.

## Live streaming (Daily.co)

- RTC uses **Daily.co**, never LiveKit — LiveKit's Gradle/Kotlin integration broke
  the Android build. Packages: `@daily-co/react-native-daily-js`,
  `@daily-co/react-native-webrtc`, and the prebuild plugin
  `@daily-co/config-plugin-rn-daily-js` (declared in `app.json` `plugins`). Adding
  a package without its config plugin leaves the native side unlinked.
- The Daily **API key never reaches the client**. The app calls the `daily-token`
  edge function, which authenticates the caller from their Supabase JWT and mints
  a meeting token. Never embed `DAILY_API_KEY` in `EXPO_PUBLIC_*`.
- `LiveRoomScreen` owns the call object lifecycle: create on mount, `leave()` then
  `destroy()` on unmount. `DailyMediaView` reads tracks from
  `participant.tracks.video.persistentTrack` (the top-level `participant.video`
  track is deprecated).
- Camera/mic permissions come from the `expo-camera` and `expo-image-picker`
  config plugins in `app.json` (`CAMERA`, `RECORD_AUDIO` on Android; the
  `NS*UsageDescription` keys on iOS). A feature needing the camera must be listed
  there or prebuild will not emit the permission.

## Client conventions

- **`useAuth().user` is the Supabase auth user** (id, email, metadata only). It
  has **no** `name`, `handle`, `avatar_url` or `bio` — those live on the
  `profiles` row exposed as `useAuth().profile`. Reading `user.name` yields
  `undefined`, which renders blank names and a `'?'` avatar letter. Use
  `profile` for display fields and `user.id` for identity.
- **`push()` from a tab screen works and opens the parent stack's screen.** A
  tab's navigation helpers are `{ ...parentHelpers, ...ownHelpers }` (see
  `useNavigationHelpers`), so a tab screen inherits the root stack's `push`; and
  an action the tab router cannot handle bubbles up through `useOnAction`.
  `PostCard`, rendered in the Home tab, relies on this to `push('PostDetail')`.
  Use `push` for a new screen on top of the stack, `navigate` to reuse an
  existing one. (Verified against `@react-navigation/core` and `routers`, not
  assumed.)
- **Navigate across navigators by naming the target explicitly**, e.g. from a
  root-stack screen into a tab: `navigation.navigate('MainTabs', { screen:
  'Messages', params: {...} })`. `navigate('Messages')` from the stack finds
  nothing.
- **Mutations throw; callers must catch.** `deletePost`/`editPost`/`likePost`/
  `sharePost`/`toggleBookmark`/`toggleFollow`/`addComment` apply an optimistic
  update, roll it back, and rethrow on failure. A fire-and-forget call site
  (`onPress={() => deletePost(id)}`) therefore becomes an unhandled rejection —
  wrap it and surface the error. `PostCard` has a small `run(fn, title)` helper
  for exactly this.
- `useApp().ready` is false until the first load finishes. Screens that would
  otherwise flash an empty state or a "deleted" message on a cold start should
  gate on it and show an `ActivityIndicator` instead.
- Soft-deleted posts (`deleted_at is not null`) are filtered by RLS for *other*
  users but **not** for the author, so every client query and the Realtime
  `posts` handler must filter `deleted_at` too or the author sees their own
  deleted posts.
- Optimistic actions must **roll back and surface the error** when the write
  fails, not just `console.warn`. A silent failure shows the user a state the
  server never accepted.
- Do not show a success message for an action that does nothing. If a feature
  has no backend (e.g. reporting has no `reports` table), say it is unavailable
  rather than faking a "submitted" confirmation.

## Never

- Insert a plaintext password via SQL. Sign up through the app, then flip flags
  with an `UPDATE` keyed on the user's email.
- Commit `mobile/package-lock.json` unless reproducibility is explicitly wanted.
- Use colours other than the palette in `mobile/src/theme.js`
  (`#000` bg, `#FFF` text, `#1D9BF0` links, `#FF4444` like button only).
