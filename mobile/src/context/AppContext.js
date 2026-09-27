import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const me = user?.id;
  const [state, setState] = useState({
    users: [], profiles: {}, posts: [], follows: [], bookmarks: [],
    conversations: [], notifications: [], comments: [], likes: [], messages: []
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!me) { setReady(true); return; }
    (async () => {
      const [profiles, posts, follows, bookmarks, convos, notifs] = await Promise.all([
        supabase.from('profiles').select('*').limit(200),
        supabase.from('posts').select('*, author:profiles(*)').order('created_at', { ascending: false }).limit(100),
        supabase.from('follows').select('*'),
        supabase.from('bookmarks').select('*').eq('user_id', me),
        supabase.from('conversations').select('*, messages(*)').or(`user_a.eq.${me},user_b.eq.${me}`),
        supabase.from('notifications').select('*').eq('user_id', me).order('created_at', { ascending: false }).limit(50)
      ]);
      setState({
        users: profiles.data || [],
        profiles: Object.fromEntries((profiles.data || []).map(p => [p.id, p])),
        posts: posts.data || [],
        follows: follows.data || [],
        bookmarks: (bookmarks.data || []).map(b => b.post_id),
        conversations: (convos.data || []).map(c => ({
          id: c.id,
          withUserId: c.user_a === me ? c.user_b : c.user_a,
          messages: c.messages || []
        })),
        notifications: notifs.data || [],
        comments: [], likes: [], messages: []
      });
      setReady(true);
    })();
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const sub = supabase.channel('voidbook-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        p => setState(s => ({ ...s, posts: [p.new, ...s.posts] })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        p => setState(s => ({ ...s, conversations: s.conversations.map(c =>
          c.id === p.new.conversation_id ? { ...c, messages: [...c.messages, p.new] } : c) })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        p => setState(s => ({ ...s, notifications: [p.new, ...s.notifications] })))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [me]);

  const api = {
    state, ready,

    addPost: async (content) => {
      const { data, error } = await supabase.from('posts')
        .insert({ content, author_id: me })
        .select('*, author:profiles(*)').single();
      if (error) throw error;
      setState(s => ({ ...s, posts: [data, ...s.posts] }));
    },

    deletePost: async (id) => {
      await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) }));
    },

    editPost: async (id, content) => {
      await supabase.from('posts').update({ content, edited_at: new Date().toISOString() }).eq('id', id);
      setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, content } : p) }));
    },

    likePost: async (id) => {
      setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, likes: (p.likes||0)+1 } : p) }));
      const { error } = await supabase.from('likes').insert({ post_id: id, user_id: me });
      if (error) {
        setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, likes: Math.max(0,(p.likes||0)-1) } : p) }));
      }
    },

    sharePost: async (id) => {
      const cur = state.posts.find(p => p.id === id);
      await supabase.from('posts').update({ shares: (cur?.shares || 0) + 1 }).eq('id', id);
      setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, shares: (p.shares||0)+1 } : p) }));
    },

    addComment: async (id, text) => {
      const { data, error } = await supabase.from('comments')
        .insert({ post_id: id, author_id: me, text })
        .select('*, author:profiles(*)').single();
      if (error) throw error;
      setState(s => ({ ...s, posts: s.posts.map(p =>
        p.id === id ? { ...p, comments: [...(p.comments || []), data] } : p) }));
    },

    toggleBookmark: async (postId) => {
      const has = state.bookmarks.includes(postId);
      if (has) {
        await supabase.from('bookmarks').delete().eq('user_id', me).eq('post_id', postId);
        setState(s => ({ ...s, bookmarks: s.bookmarks.filter(b => b !== postId) }));
      } else {
        await supabase.from('bookmarks').insert({ user_id: me, post_id: postId });
        setState(s => ({ ...s, bookmarks: [postId, ...s.bookmarks] }));
      }
    },

    toggleFollow: async (userId) => {
      const f = state.follows.some(x => x.follower_id === me && x.followee_id === userId);
      if (f) {
        await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', userId);
        setState(s => ({ ...s, follows: s.follows.filter(x => !(x.follower_id === me && x.followee_id === userId)) }));
      } else {
        await supabase.from('follows').insert({ follower_id: me, followee_id: userId });
        setState(s => ({ ...s, follows: [...s.follows, { follower_id: me, followee_id: userId }] }));
      }
    },

    sendMessage: async (convId, text) => {
      const { data, error } = await supabase.from('messages')
        .insert({ conversation_id: convId, sender_id: me, text })
        .select().single();
      if (error) throw error;
      setState(s => ({ ...s, conversations: s.conversations.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, data] } : c) }));
    },

    createConversation: async (otherId) => {
      const [a, b] = me < otherId ? [me, otherId] : [otherId, me];
      const { data, error } = await supabase.from('conversations')
        .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })
        .select().single();
      if (error) throw error;
      if (!state.conversations.some(c => c.id === data.id)) {
        setState(s => ({ ...s, conversations: [
          { id: data.id, withUserId: otherId, messages: [] }, ...s.conversations] }));
      }
      return data.id;
    },

    markConversationRead: async (convId) => {
      await supabase.from('messages').update({ read: true })
        .eq('conversation_id', convId).neq('sender_id', me);
      setState(s => ({ ...s, conversations: s.conversations.map(c =>
        c.id === convId ? { ...c, messages: c.messages.map(m => ({ ...m, read: true })) } : c) }));
    },

    markNotificationRead: async (id) => {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    },

    clearNotifications: async () => {
      await supabase.from('notifications').delete().eq('user_id', me);
      setState(s => ({ ...s, notifications: [] }));
    },

    // Placeholders — keep signatures so existing screens don't crash
    toggleGroup: () => {}, acceptFriend: () => {}, rejectFriend: () => {},
    addListing: () => {}, goLive: () => {}, bumpLiveViewers: () => {},
    endLive: () => {}, updateSettings: () => {}, saveDraft: () => {},
    deleteDraft: () => {}, reportItem: () => {}
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
