import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadState, saveState, DEFAULT_STATE } from '../store';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadState().then(s => { setState(s); setReady(true); }); }, []);
  useEffect(() => { if (ready) saveState(state); }, [state, ready]);

  const api = {
    state, ready,
    addPost: (content) => setState(s => ({ ...s, posts: [{
      id:'p'+Date.now(), userId: user?.id || 'me', content, likes:0, comments:[], shares:0,
      ts: Date.now()
    }, ...s.posts] })),
    deletePost: (id) => setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) })),
    likePost: (id) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, likes:p.likes+1} : p) })),
    sharePost: (id) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, shares:p.shares+1} : p) })),
    addComment: (id, text) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, comments: [...p.comments, { id: 'c'+Date.now(), userId: user?.id || 'me', text, ts: Date.now() }]} : p) })),
    sendMessage: (convId, text) => setState(s => ({ ...s,
      conversations: s.conversations.map(c => c.id===convId ? {...c,
        messages: [...c.messages, { id:'m'+Date.now(), from: user?.id || 'me', text, ts: Date.now() }]
      } : c) })),
    createConversation: (userId) => setState(s => {
      const exists = s.conversations.find(c => c.withUserId === userId);
      if (exists) return s;
      return { ...s, conversations: [{ id: 'c'+Date.now(), withUserId: userId, messages: [] }, ...s.conversations] };
    }),
    markNotificationRead: (id) => setState(s => ({ ...s,
      notifications: s.notifications.map(n => n.id===id ? {...n, read:true} : n) })),
    clearNotifications: () => setState(s => ({ ...s, notifications: [] })),
    toggleGroup: (id) => setState(s => ({ ...s,
      groups: s.groups.map(g => g.id===id ? {...g, joined: !g.joined,
        members: g.joined ? g.members-1 : g.members+1 } : g) })),
    acceptFriend: (reqId) => setState(s => {
      const r = s.friends.requests.find(x => x.id===reqId);
      if (!r) return s;
      return { ...s, friends: {
        friends: [...s.friends.friends, r.userId],
        requests: s.friends.requests.filter(x => x.id!==reqId),
        suggestions: s.friends.suggestions.filter(u => u!==r.userId)
      }};
    }),
    rejectFriend: (reqId) => setState(s => ({ ...s,
      friends: { ...s.friends,
        requests: s.friends.requests.filter(x => x.id!==reqId) } })),
    addListing: (listing) => setState(s => ({ ...s, listings: [{ id: 'l'+Date.now(), sellerId: user?.id || 'me', ...listing }, ...s.listings] })),
    goLive: (title) => setState(s => ({ ...s, watch: [{ id: 'w'+Date.now(), userId: user?.id || 'me', title, views: 0, ts: Date.now(), live: true }, ...s.watch] }))
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
