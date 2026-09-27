import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadState, saveState, DEFAULT_STATE } from '../store';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadState().then(s => { setState(s); setReady(true); }); }, []);
  useEffect(() => { if (ready) saveState(state); }, [state, ready]);

  const api = {
    state, ready,
    addPost: (content) => setState(s => ({ ...s, posts: [{
      id:'p'+Date.now(), userId:'me', content, likes:0, comments:[], shares:0,
      ts: Date.now()
    }, ...s.posts] })),
    likePost: (id) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, likes:p.likes+1} : p) })),
    sharePost: (id) => setState(s => ({ ...s,
      posts: s.posts.map(p => p.id===id ? {...p, shares:p.shares+1} : p) })),
    sendMessage: (convId, text) => setState(s => ({ ...s,
      conversations: s.conversations.map(c => c.id===convId ? {...c,
        messages: [...c.messages, { id:'m'+Date.now(), from:'me', text, ts: Date.now() }]
      } : c) })),
    markNotificationRead: (id) => setState(s => ({ ...s,
      notifications: s.notifications.map(n => n.id===id ? {...n, read:true} : n) })),
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
        requests: s.friends.requests.filter(x => x.id!==reqId) } }))
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
