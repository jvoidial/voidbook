import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Where Supabase should send the user after they tap the confirmation email.
// Must match the `sqawk` scheme in app.json and the Redirect URLs allow-list
// in the Supabase Auth dashboard.
export const EMAIL_REDIRECT = 'sqawk://confirm';

// Password-recovery links. Kept distinct from EMAIL_REDIRECT so the app can
// tell a fresh signup confirmation from a "set a new password" return.
export const RESET_REDIRECT = 'sqawk://reset-password';

// Supabase returns the session either in the URL fragment (implicit flow,
// default) or as a `?code=` query param (PKCE flow). react-native-url-polyfill
// does not expose the fragment through URL, so read the raw string and handle
// both shapes.
function parseAuthUrl(url) {
  const s = url || '';
  const hash = s.includes('#') ? s.split('#')[1] : '';
  const query = s.includes('?') ? s.split('?')[1].split('#')[0] : '';
  const h = new URLSearchParams(hash);
  const q = new URLSearchParams(query);
  const err = h.get('error_description') || q.get('error_description') || h.get('error') || q.get('error');
  if (err) return { error: err };
  // `type=recovery` marks a password-reset link rather than a signup confirmation.
  const type = h.get('type') || q.get('type') || '';
  if (h.get('access_token')) return { accessToken: h.get('access_token'), refreshToken: h.get('refresh_token'), type };
  if (q.get('code')) return { code: q.get('code'), type };
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = async (uid) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data || null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user?.id).finally(() => setReady(true));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      loadProfile(s?.user?.id);
    });

    const handleUrl = async (url) => {
      const parsed = parseAuthUrl(url);
      if (!parsed) return;
      if (parsed.error) { setError(parsed.error); return; }
      const { error: e } = parsed.code
        ? await supabase.auth.exchangeCodeForSession(parsed.code)
        : await supabase.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
      if (e) { setError(e.message); return; }
      // detectSessionInUrl is false, so GoTrueClient never raises its own
      // PASSWORD_RECOVERY event here; the link itself is the only signal.
      if (parsed.type === 'recovery') setRecovering(true);
    };

    Linking.getInitialURL().then((url) => url && handleUrl(url));
    const linkSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      sub.subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const patchProfile = (p) => setProfile(prev => ({ ...prev, ...p }));

  return (
    <Ctx.Provider value={{
      user, session, ready, error, profile, recovering,
      clearRecovery: () => setRecovering(false),
      refreshProfile: () => loadProfile(user?.id),
      signUp: async ({ email, password, name, handle }) => {
        setError(null);
        // Mirror the DB constraint (^[a-z0-9_]{3,30}$) so the signup trigger
        // never has to fall back to a generated handle.
        const cleanHandle = (handle || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: EMAIL_REDIRECT,
            data: { name: name.trim(), handle: cleanHandle.length >= 3 ? cleanHandle : undefined }
          }
        });
        if (error) { setError(error.message); throw error; }
        return data;
      },
      signIn: async ({ email, password }) => {
        setError(null);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });
        if (error) { setError(error.message); throw error; }
        return data;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
      },
      resetPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: RESET_REDIRECT
        });
        if (error) throw error;
      },
      // Requires a live session (either signed in, or restored by the recovery
      // link), which is exactly the guarantee we want before changing a password.
      changePassword: async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      },
      uploadAvatar: async (publicUrl) => {
        if (!user) return;
        const { error } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
        if (error) throw error;
        patchProfile({ avatar_url: publicUrl });
      },
      uploadCover: async (publicUrl) => {
        if (!user) return;
        const { error } = await supabase.from('profiles').update({ cover_url: publicUrl }).eq('id', user.id);
        if (error) throw error;
        patchProfile({ cover_url: publicUrl });
      },
      updateProfile: async (patch) => {
        if (!user) return;
        const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
        if (error) throw error;
        patchProfile(patch);
      }
    }}>{children}</Ctx.Provider>
  );
}
