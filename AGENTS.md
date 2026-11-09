# AGENTS.md — sqawk (formerly voidbook)

Expo 51 / React Native Android app + Supabase backend. Repo: `jvoidial/voidbook`.
The app ships as **sqawk**, a strict black-and-white social client.

## Layout

- `mobile/` — the app. `mobile/src/` holds `screens/`, `components/`, `context/`, `lib/`.
- `mobile/src/screens/auth/` — Welcome, SignIn, SignUp, ResetPassword.
- `supabase/migrations/` — numbered, idempotent SQL. Apply in order in the SQL editor.
- `.github/workflows/voidbook.yml` — builds the release APK on every push to `main`
  and publishes it to a GitHub Release.

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

## Client conventions

- **`useAuth().user` is the Supabase auth user** (id, email, metadata only). It
  has **no** `name`, `handle`, `avatar_url` or `bio` — those live on the
  `profiles` row exposed as `useAuth().profile`. Reading `user.name` yields
  `undefined`, which renders blank names and a `'?'` avatar letter. Use
  `profile` for display fields and `user.id` for identity.
- **`push()` only exists on a stack navigator.** A screen inside the bottom-tab
  navigator gets the *tab* router's helpers, which are `navigate`/`jumpTo` only —
  `navigation.push` is `undefined` there and throws. From a tab screen use
  `navigate`. (A component rendered under a tab screen inherits that tab's
  navigation object, so `PostCard` must use `navigate` too.)
- **Navigate across navigators by naming the target explicitly**, e.g. from a
  root-stack screen into a tab: `navigation.navigate('MainTabs', { screen:
  'Messages', params: {...} })`. `navigate('Messages')` from the stack finds
  nothing.
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
