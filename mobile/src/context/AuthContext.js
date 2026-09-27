import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'voidbook.session.v1';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const uid = () => 'u_' + Math.random().toString(36).slice(2, 10);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUser(parsed.user);
          setUsers(parsed.users || {});
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const persist = async (u, list) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify({ user: u, users: list }));
    } catch {}
  };

  const api = {
    user, ready,
    signUp: async ({ name, handle, email, password }) => {
      const key = email.trim().toLowerCase();
      if (!key || !password || password.length < 6) throw new Error('Invalid email or password (min 6 chars).');
      if (users[key]) throw new Error('Account already exists. Sign in instead.');
      const account = {
        id: uid(),
        name: name.trim(),
        handle: '@' + (handle || name).trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        email: key,
        bio: 'Living in the void.',
        friends: [],
        createdAt: Date.now()
      };
      const next = { ...users, [key]: { ...account, password } };
      setUsers(next);
      setUser(account);
      await persist(account, next);
      return account;
    },
    signIn: async ({ email, password }) => {
      const key = email.trim().toLowerCase();
      const acc = users[key];
      if (!acc || acc.password !== password) throw new Error('Invalid credentials.');
      const { password: _, ...account } = acc;
      setUser(account);
      await persist(account, users);
      return account;
    },
    signOut: async () => {
      setUser(null);
      await AsyncStorage.removeItem(KEY);
    },
    updateProfile: async (patch) => {
      if (!user) return;
      const next = { ...user, ...patch };
      setUser(next);
      const key = user.email;
      const list = { ...users, [key]: { ...users[key], ...patch } };
      setUsers(list);
      await persist(next, list);
    }
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
