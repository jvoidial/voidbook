import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadState, saveState, DEFAULT_STATE } from '../store';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const me = user?.id || 'me';
  const [state, setState] = useState(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadState().then(s => { setState(s); setReady(true); }); }, []);
  useEffect(() => { if (ready) saveState(state); }, [state, ready]);

  // Auto-inject signed-in user into users list
  useEffect(() => {
    if (!ready || !user) return;
    setState(s => {
      if (s.users.find(u => u.id === me)) return s;
      return { ...s, users: [{ id: me, name: user.name, handle: user.handle, bio: user.bio, followers: 0, following: 0, verified: false }, ...s.users] };
    });
  }, [ready, user, me]);

  const api = {
    state, ready,
    addPost: (content) => setState(s => ({ ...s,
      posts: [{ id:'p'+Date.now(), userId:me, content, likes:0, comments:[], shares:0, ts:Date.now() }, ...s.posts] })),
    deletePost: (id) => setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) })),
    editPost: (id, content) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? { ...p, content, editedAt: Date.now() } : p) })),
    likePost: (id) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, likes:(p.likes||0)+1} : p) })),
    sharePost: (id) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, shares:(p.shares||0)+1} : p) })),
    addComment: (id, text) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, comments:[...(p.comments||[]),
        { id:'c'+Date.now(), userId:me, text, ts:Date.now() }]} : p) })),
    toggleBookmark: (postId) => setState(s => {
      const has = s.bookmarks.includes(postId);
      return { ...s, bookmarks: has ? s.bookmarks.filter(id => id !== postId) : [postId, ...s.bookmarks] };
    }),
    toggleFollow: (userId) => setState(s => {
      const has = s.follows.following.includes(userId);
      return { ...s, follows: { following: has ? s.follows.following.filter(id => id !== userId) : [...s.follows.following, userId] } };
    }),
    sendMessage: (convId, text) => setState(s => ({ ...s,
      conversations: s.conversations.map(c => c.id===convId ? {...c,
        messages:[...c.messages, { id:'m'+Date.now(), from:me, text, ts:Date.now(), read:false }]} : c) })),
    createConversation: (userId) => setState(s => {
      if (s.conversations.find(c => c.withUserId === userId)) return s;
      return { ...s, conversations: [{ id:'c'+Date.now(), withUserId:userId, messages:[] }, ...s.conversations] };
    }),
    markConversationRead: (convId) => setState(s => ({ ...s,
      conversations: s.conversations.map(c => c.id===convId ? {...c,
        messages: c.messages.map(m => ({ ...m, read: true })) } : c) })),
    markNotificationRead: (id) => setState(s => ({ ...s,
      notifications: s.notifications.map(n => n.id===id ? {...n, read:true} : n) })),
    clearNotifications: () => setState(s => ({ ...s, notifications: [] })),
    toggleGroup: (id) => setState(s => ({ ...s,
      groups: s.groups.map(g => g.id===id ? {...g, joined:!g.joined,
        members: g.joined ? g.members-1 : g.members+1 } : g) })),
    acceptFriend: (reqId) => setState(s => {
      const r = s.friends.requests.find(x => x.id===reqId);
      if (!r) return s;
      return { ...s, friends: {
        friends:[...s.friends.friends, r.userId],
        requests: s.friends.requests.filter(x => x.id!==reqId),
        suggestions: s.friends.suggestions.filter(u => u!==r.userId)
      }};
    }),
    rejectFriend: (reqId) => setState(s => ({ ...s,
      friends:{ ...s.friends, requests: s.friends.requests.filter(x => x.id!==reqId) } })),
    addListing: (l) => setState(s => ({ ...s, listings: [{ id:'l'+Date.now(), sellerId:me, ...l }, ...s.listings] })),
    goLive: (title) => setState(s => ({ ...s, watch: [{ id:'w'+Date.now(), userId:me, title, views:0, ts:Date.now(), live:true, viewers:0 }, ...s.watch] })),
    bumpLiveViewers: (id) => setState(s => ({ ...s, watch: s.watch.map(w => w.id===id && w.live ? {...w, viewers:(w.viewers||0)+1, views:(w.views||0)+1} : w) })),
    endLive: (id) => setState(s => ({ ...s, watch: s.watch.map(w => w.id===id ? {...w, live:false} : w) })),
    updateSettings: (patch) => setState(s => ({ ...s, settings:{ ...s.settings, ...patch } }))
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
