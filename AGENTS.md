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
- `.github/workflows/build-all.yml` — builds **both** platforms on every push to
  `main`: `build-android` (release APK) and `build-ios` (IPA). Publishes both to
  the same GitHub Release. The iOS job is skipped with a warning when the Apple
  signing secrets are absent, so Android releases never depend on them.

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
