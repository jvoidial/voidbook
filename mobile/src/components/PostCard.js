import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function PostCard({ post, user }) {
  const nav = useNavigation();
  const { user: me } = useAuth();
  const { state, likePost, sharePost, deletePost, toggleBookmark } = useApp();
  const mins = Math.floor((Date.now() - new Date(post.created_at || post.ts).getTime()) / 60000);
  const timeLabel = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h` : `${Math.floor(mins/1440)}d`;
  const bookmarked = state.bookmarks.includes(post.id);

  const renderContent = (c) => (c || '').split(/(\s+)/).map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@')) return <Text key={i} style={{ color: T.accent, fontWeight: '600' }}>{part}</Text>;
    return part;
  });

  return (
    <View style={S.card}>
      {/* Thread line (X-style) */}
      <View style={S.threadLine} />

      <View style={S.contentWrap}>
        <View style={S.head}>
          <TouchableOpacity onPress={() => nav.push('UserProfile', { userId: user?.id })}>
            <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={S.nm}>{user?.name || 'Unknown'}</Text>
              {user?.verified && <Ionicons name="checkmark-circle" size={14} color={T.accent} />}
              <Text style={S.hd}>@{user?.handle?.replace('@','')} · {timeLabel}</Text>
            </View>
            <Text style={S.ct}>{renderContent(post.content)}</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Options', '', [
            ...(me?.id === post.userId ? [{ text:'Delete', style:'destructive', onPress:() => deletePost(post.id) }] : []),
            { text: 'Report', onPress: () => Alert.alert('Reported') },
            { text: 'Cancel', style: 'cancel' }
          ])}>
            <Ionicons name="ellipsis-horizontal" size={16} color={T.muted} />
          </TouchableOpacity>
        </View>

        {/* X-Style Action Bar */}
        <View style={S.bar}>
          <TouchableOpacity style={S.b} onPress={() => nav.push('PostDetail', { postId: post.id })}>
            <Ionicons name="chatbubble-outline" size={16} color={T.muted} />
            <Text style={S.bt}>{(post.comments||[]).length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b} onPress={() => sharePost(post.id)}>
            <Ionicons name="repeat-outline" size={16} color={T.muted} />
            <Text style={S.bt}>{post.shares || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b} onPress={() => likePost(post.id)}>
            <Ionicons name="heart-outline" size={16} color={T.muted} />
            <Text style={S.bt}>{post.likes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b}>
            <Ionicons name="stats-chart-outline" size={16} color={T.muted} />
            <Text style={S.bt}>1.2K</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b} onPress={() => toggleBookmark(post.id)}>
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color={bookmarked ? T.accent : T.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={S.b}>
            <Ionicons name="share-outline" size={16} color={T.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: T.bg, paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  threadLine: { width: 2, backgroundColor: T.divider, position: 'absolute', left: 33, top: 48, bottom: -12 },
  contentWrap: { flex: 1, marginLeft: 12, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  av: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.accent, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avT: { color: T.accent, fontWeight: '900', fontSize: 14 },
  nm: { color: T.text, fontWeight: '700', fontSize: 15 },
  hd: { color: T.muted, fontSize: 13 },
  ct: { color: T.text, fontSize: 15, lineHeight: 21, marginTop: 2, marginBottom: 10 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 24 },
  b: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  bt: { color: T.muted, fontSize: 12 }
});
