import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Rows come back in snake_case; the screens consume the shapes below.
const mapComment = (c) => ({ ...c, userId: c.author_id, ts: c.created_at });
const mapMessage = (m) => ({ ...m, from: m.sender_id, ts: m.created_at });
const mapNotification = (n) => ({ ...n, userId: n.actor_id, type: n.kind, ts: n.created_at });

const EMPTY = {
  users: [], profiles: {}, posts: [], follows: [], bookmarks: [], myLikes: [],
  conversations: [], notifications: [],
  // Present for the not-yet-migrated placeholder screens (Groups, Marketplace,
  // Friends) so they render an empty list instead of throwing.
  groups: [], listings: [], friends: { friends: [], requests: [], suggestions: [] },
};

function normalizePosts(posts, comments, likes, me) {
  const byPost = {};
  for (const c of comments) (byPost[c.post_id] ||= []).push(mapComment(c));

  const counts = {};
  const mine = [];
  for (const l of likes) {
    counts[l.post_id] = (counts[l.post_id] || 0) + 1;
    if (l.user_id === me) mine.push(l.post_id);
  }

  return {
    posts: posts.map(p => ({
      ...p,
      userId: p.author_id,
      ts: p.created_at,
      likes: counts[p.id] || 0,
      comments: byPost[p.id] || []
    })),
    myLikes: mine
  };
}

export function AppProvider({ children }) {
  const { user } = useAuth();
  const me = user?.id;
  const [state, setState] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Merge a raw `comments` row into its post. Idempotent, so the global
  // subscription and a post-scoped one can both feed it without duplicating.
  const ingestComment = (c) => setState(s => ({
    ...s,
    posts: s.posts.map(p => p.id === c.post_id
      ? { ...p, comments: p.comments.some(x => x.id === c.id) ? p.comments : [...p.comments, mapComment(c)] }
      : p)
  }));

  useEffect(() => {
    if (!me) { setState(EMPTY); setReady(true); return; }
    let alive = true;
    (async () => {
      try {
        const [profiles, posts, follows, bookmarks, convos, notifs, comments, likes] = await Promise.all([
          supabase.from('profiles').select('*').limit(500),
          // Soft-deleted posts are hidden by the `posts_read_public` policy for
          // other users, but the author's own policy lets them through, so
          // filter explicitly or your deleted posts linger in your feed.
          supabase.from('posts').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(100),
          supabase.from('follows').select('*'),
          supabase.from('bookmarks').select('*').eq('user_id', me),
          supabase.from('conversations').select('*, messages(*)').or(`user_a.eq.${me},user_b.eq.${me}`),
          supabase.from('notifications').select('*').eq('user_id', me).order('created_at', { ascending: false }).limit(50),
          supabase.from('comments').select('*').order('created_at', { ascending: true }).limit(1000),
          supabase.from('likes').select('*')
        ]);
        if (!alive) return;

        const profileRows = profiles.data || [];
        const { posts: feed, myLikes } = normalizePosts(posts.data || [], comments.data || [], likes.data || [], me);

        setState({
          ...EMPTY,
          users: profileRows,
          profiles: Object.fromEntries(profileRows.map(p => [p.id, p])),
          posts: feed,
          follows: follows.data || [],
          bookmarks: (bookmarks.data || []).map(b => b.post_id),
          myLikes,
          conversations: (convos.data || []).map(c => ({
            id: c.id,
            withUserId: c.user_a === me ? c.user_b : c.user_a,
            messages: (c.messages || []).map(mapMessage).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          })),
          notifications: (notifs.data || []).map(mapNotification)
        });
      } catch (e) {
        console.warn('[sqawk] initial load failed:', e?.message || e);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const sub = supabase.channel('sqawk-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, ({ new: p }) =>
        // Guard deleted_at: the author's own RLS policy still delivers their
        // soft-deleted rows over Realtime.
        (p.deleted_at) ? undefined : setState(s => s.posts.some(x => x.id === p.id) ? s : {
          ...s,
          posts: [{ ...p, userId: p.author_id, ts: p.created_at, likes: 0, comments: [] }, ...s.posts]
        }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, ({ new: p }) =>
        setState(s => ({
          ...s,
          // A post that was just soft-deleted must leave the feed, not merge.
          posts: p.deleted_at
            ? s.posts.filter(x => x.id !== p.id)
            : s.posts.map(x => x.id === p.id ? { ...x, ...p, userId: p.author_id, ts: p.created_at } : x)
        })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, ({ new: c }) =>
        ingestComment(c))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) =>
        setState(s => ({ ...s, conversations: s.conversations.map(c => c.id === m.conversation_id
          ? { ...c, messages: c.messages.some(x => x.id === m.id) ? c.messages : [...c.messages, mapMessage(m)] }
          : c) })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, ({ new: n }) =>
        setState(s => s.notifications.some(x => x.id === n.id) ? s : {
          ...s, notifications: [mapNotification(n), ...s.notifications]
        }))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [me]);

  const patchPost = (id, patch) =>
    setState(s => ({ ...s, posts: s.posts.map(p => p.id === id ? { ...p, ...patch } : p) }));

  const api = {
    state, ready, ingestComment,

    addPost: async (content, mediaUrl, mediaType) => {
      const { data, error } = await supabase.from('posts')
        .insert({ content: content || '', author_id: me, media_url: mediaUrl || null, media_type: mediaType || null })
        .select('*').single();
      if (error) throw error;
      setState(s => s.posts.some(p => p.id === data.id) ? s : {
        ...s, posts: [{ ...data, userId: data.author_id, ts: data.created_at, likes: 0, comments: [] }, ...s.posts]
      });
    },

    deletePost: async (id) => {
      setState(s => ({ ...s, posts: s.posts.filter(p => p.id !== id) }));
      const { error } = await supabase.from('posts')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) console.warn('[sqawk] deletePost:', error.message);
    },

    editPost: async (id, content) => {
      const edited_at = new Date().toISOString();
      patchPost(id, { content, edited_at });
      const { error } = await supabase.from('posts').update({ content, edited_at }).eq('id', id);
      if (error) console.warn('[sqawk] editPost:', error.message);
    },

    // Optimistic toggle: like/unlike backed by the `likes` join table.
    likePost: async (id) => {
      const liked = stateRef.current.myLikes.includes(id);
      setState(s => ({
        ...s,
        myLikes: liked ? s.myLikes.filter(x => x !== id) : [id, ...s.myLikes],
        posts: s.posts.map(p => p.id === id ? { ...p, likes: Math.max(0, (p.likes || 0) + (liked ? -1 : 1)) } : p)
      }));
      const { error } = liked
        ? await supabase.from('likes').delete().eq('user_id', me).eq('post_id', id)
        : await supabase.from('likes').insert({ post_id: id, user_id: me });
      if (error) {
        setState(s => ({
          ...s,
          myLikes: liked ? [id, ...s.myLikes] : s.myLikes.filter(x => x !== id),
          posts: s.posts.map(p => p.id === id ? { ...p, likes: Math.max(0, (p.likes || 0) + (liked ? 1 : -1)) } : p)
        }));
      }
    },

    sharePost: async (id) => {
      const cur = stateRef.current.posts.find(p => p.id === id);
      const shares = (cur?.shares || 0) + 1;
      patchPost(id, { shares });
      const { error } = await supabase.from('posts').update({ shares }).eq('id', id);
      if (error) console.warn('[sqawk] sharePost:', error.message);
    },

    addComment: async (id, text) => {
      // Optimistic: render the comment at once, then reconcile with the row the
      // server returns. The temp id is swapped for the real one so the Realtime
      // echo of that same row dedupes instead of doubling.
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic = { id: tempId, post_id: id, author_id: me, text, created_at: new Date().toISOString() };
      setState(s => ({ ...s, posts: s.posts.map(p => p.id === id
        ? { ...p, comments: [...p.comments, mapComment(optimistic)] } : p) }));

      const { data, error } = await supabase.from('comments')
        .insert({ post_id: id, author_id: me, text })
        .select('*').single();
      if (error) {
        setState(s => ({ ...s, posts: s.posts.map(p => p.id === id
          ? { ...p, comments: p.comments.filter(c => c.id !== tempId) } : p) }));
        throw error;
      }
      setState(s => ({ ...s, posts: s.posts.map(p => p.id === id
        ? { ...p, comments: p.comments.some(x => x.id === data.id)
            ? p.comments.filter(c => c.id !== tempId)
            : p.comments.map(c => c.id === tempId ? mapComment(data) : c) }
        : p) }));
    },

    toggleBookmark: async (postId) => {
      const has = stateRef.current.bookmarks.includes(postId);
      setState(s => ({ ...s, bookmarks: has ? s.bookmarks.filter(b => b !== postId) : [postId, ...s.bookmarks] }));
      const { error } = has
        ? await supabase.from('bookmarks').delete().eq('user_id', me).eq('post_id', postId)
        : await supabase.from('bookmarks').insert({ user_id: me, post_id: postId });
      if (error) {
        setState(s => ({ ...s, bookmarks: has ? [postId, ...s.bookmarks] : s.bookmarks.filter(b => b !== postId) }));
      }
    },

    toggleFollow: async (userId) => {
      const following = stateRef.current.follows.some(x => x.follower_id === me && x.followee_id === userId);
      setState(s => ({ ...s, follows: following
        ? s.follows.filter(x => !(x.follower_id === me && x.followee_id === userId))
        : [...s.follows, { follower_id: me, followee_id: userId }] }));
      const { error } = following
        ? await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', userId)
        : await supabase.from('follows').insert({ follower_id: me, followee_id: userId });
      if (error) {
        setState(s => ({ ...s, follows: following
          ? [...s.follows, { follower_id: me, followee_id: userId }]
          : s.follows.filter(x => !(x.follower_id === me && x.followee_id === userId)) }));
        throw error;
      }
    },

    sendMessage: async (convId, text) => {
      const { data, error } = await supabase.from('messages')
        .insert({ conversation_id: convId, sender_id: me, text })
        .select('*').single();
      if (error) throw error;
      setState(s => ({ ...s, conversations: s.conversations.map(c => c.id === convId
        ? { ...c, messages: c.messages.some(x => x.id === data.id) ? c.messages : [...c.messages, mapMessage(data)] }
        : c) }));
    },

    createConversation: async (otherId) => {
      const [a, b] = me < otherId ? [me, otherId] : [otherId, me];
      const { data, error } = await supabase.from('conversations')
        .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })
        .select().single();
      if (error) throw error;
      if (!stateRef.current.conversations.some(c => c.id === data.id)) {
        setState(s => ({ ...s, conversations: [
          { id: data.id, withUserId: otherId, messages: [] }, ...s.conversations] }));
      }
      return data.id;
    },

    markConversationRead: async (convId) => {
      setState(s => ({ ...s, conversations: s.conversations.map(c =>
        c.id === convId ? { ...c, messages: c.messages.map(m => ({ ...m, read: true })) } : c) }));
      await supabase.from('messages').update({ read: true })
        .eq('conversation_id', convId).neq('sender_id', me);
    },

    markNotificationRead: async (id) => {
      setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    },

    clearNotifications: async () => {
      setState(s => ({ ...s, notifications: [] }));
      await supabase.from('notifications').delete().eq('user_id', me);
    },


    // Not part of the current schema; kept so existing screens don't crash.
    toggleGroup: () => {}, acceptFriend: () => {}, rejectFriend: () => {},
    addListing: () => {}, reportItem: () => {}
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
