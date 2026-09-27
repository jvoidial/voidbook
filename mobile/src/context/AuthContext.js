import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user, session, ready, error,
      signUp: async ({ email, password, name, handle }) => {
        setError(null);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { name: name.trim(), handle: handle.trim().toLowerCase() } }
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
      },
      updateProfile: async (patch) => {
        if (!user) return;
        const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
        if (error) throw error;
      }
    }}>{children}</Ctx.Provider>
  );
}
