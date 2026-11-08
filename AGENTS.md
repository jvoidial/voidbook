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
  `is_verified`, `is_premium`) are therefore protected by a `BEFORE UPDATE`
  trigger that rejects changes unless the caller is already an admin or the
  write comes from a trusted context (`auth.uid() is null`, i.e. service role /
  SQL editor). See `006_premium_and_admin.sql`.
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

## Never

- Insert a plaintext password via SQL. Sign up through the app, then flip flags
  with an `UPDATE` keyed on the user's email.
- Commit `mobile/package-lock.json` unless reproducibility is explicitly wanted.
- Use colours other than the palette in `mobile/src/theme.js`
  (`#000` bg, `#FFF` text, `#1D9BF0` links, `#FF4444` like button only).
