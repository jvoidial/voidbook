import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function PostCard({ post, user }) {
  const nav = useNavigation();
  const { user: me } = useAuth();
  const { state, likePost, sharePost, toggleBookmark } = useApp();
  const mins = Math.floor((Date.now() - new Date(post.created_at || post.ts).getTime()) / 60000);
  const timeLabel = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h` : `${Math.floor(mins/1440)}d`;
  const bookmarked = state.bookmarks.includes(post.id);

  const renderContent = (c) => (c || '').split(/(\s+)/).map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@')) return <Text key={i} style={{ color: T.accent }}>{part}</Text>;
    return part;
  });

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => nav.push('PostDetail', { postId: post.id })} style={S.card}>
      <TouchableOpacity onPress={() => nav.push('UserProfile', { userId: user?.id })}>
        <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
      </TouchableOpacity>
      
      <View style={S.contentWrap}>
        <View style={S.head}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
            <Text style={S.nm} numberOfLines={1}>{user?.name || 'Unknown'}</Text>
            {user?.verified && <Ionicons name="checkmark-circle" size={15} color={T.accent} />}
            <Text style={S.hd} numberOfLines={1}>@{user?.handle?.replace('@','')} · {timeLabel}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={16} color={T.muted} />
          </TouchableOpacity>
        </View>

        <Text style={S.ct}>{renderContent(post.content)}</Text>

        {post.media_url && post.media_type === 'image' && (
          <Image source={{ uri: post.media_url }} style={S.media} resizeMode="cover" />
        )}

        <View style={S.bar}>
          <TouchableOpacity style={S.b}>
            <Ionicons name="chatbubble-outline" size={18} color={T.muted} />
            <Text style={S.bt}>{(post.comments||[]).length || ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b} onPress={() => sharePost(post.id)}>
            <Ionicons name="repeat-outline" size={20} color={T.muted} />
            <Text style={S.bt}>{post.shares || ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b} onPress={() => likePost(post.id)}>
            <Ionicons name="heart-outline" size={18} color={T.muted} />
            <Text style={S.bt}>{post.likes || ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b}>
            <Ionicons name="stats-chart-outline" size={18} color={T.muted} />
            <Text style={S.bt}>{post.views || '1.2K'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.b} onPress={() => toggleBookmark(post.id)}>
            <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={18} color={bookmarked ? T.accent : T.muted} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: T.bg, paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avT: { color: T.text, fontWeight: 'bold', fontSize: 16 },
  contentWrap: { flex: 1, paddingBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  nm: { color: T.text, fontWeight: '700', fontSize: 15 },
  hd: { color: T.muted, fontSize: 15 },
  ct: { color: T.text, fontSize: 15, lineHeight: 20, marginTop: 2, marginBottom: 8 },
  media: { width: '100%', height: 200, borderRadius: 16, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 32, marginTop: 4 },
  b: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bt: { color: T.muted, fontSize: 13 }
});
