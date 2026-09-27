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
  const mins = Math.floor((Date.now() - post.ts) / 60000);
  const timeLabel = mins < 1 ? 'now' : mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins/60)}h` : `${Math.floor(mins/1440)}d`;
  const bookmarked = state.bookmarks.includes(post.id);

  const renderContent = (c) => (c || '').split(/(\s+)/).map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@')) return <Text key={i} style={{ color: T.accent, fontWeight: '600' }}>{part}</Text>;
    return part;
  });

  const openProfile = () => { if (user?.id) nav.push('UserProfile', { userId: user.id }); };

  return (
    <View style={S.card}>
      <View style={S.head}>
        <TouchableOpacity onPress={openProfile}>
          <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Text style={S.nm}>{user?.name || 'Unknown'}</Text>
            {user?.verified && <Ionicons name="checkmark-circle" size={14} color={T.accent} />}
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Text style={S.hd}>@{user?.handle?.replace('@','')}</Text>
            <Text style={S.dot}>·</Text>
            <Text style={S.hd}>{timeLabel}</Text>
            {post.editedAt && <><Text style={S.dot}>·</Text><Text style={S.hd}>edited</Text></>}
          </View>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Options', '', [
          ...(me?.id === post.userId ? [{ text:'Delete', style:'destructive', onPress:() => deletePost(post.id) }] : []),
          { text: 'Report', onPress: () => Alert.alert('Reported') },
          { text: 'Cancel', style: 'cancel' }
        ])}>
          <Ionicons name="ellipsis-horizontal" size={18} color={T.muted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => nav.push('PostDetail', { postId: post.id })}>
        <Text style={S.ct}>{renderContent(post.content)}</Text>
      </TouchableOpacity>

      {(post.likes > 0 || post.shares > 0 || (post.comments||[]).length > 0) && (
        <View style={S.statsRow}>
          <View style={S.statLeft}>
            {post.likes > 0 && (
              <View style={S.likeBadge}>
                <Ionicons name="heart" size={11} color="#FFF" />
              </View>
            )}
            <Text style={S.statT}>{post.likes > 0 ? `${post.likes} likes` : ''}</Text>
          </View>
          <Text style={S.statT}>
            {(post.comments||[]).length > 0 && `${(post.comments||[]).length} comments`}
            {(post.comments||[]).length > 0 && post.shares > 0 && ' · '}
            {post.shares > 0 && `${post.shares} shares`}
          </Text>
        </View>
      )}

      <View style={S.divider} />

      <View style={S.bar}>
        <TouchableOpacity style={S.b} onPress={() => nav.push('PostDetail', { postId: post.id })}>
          <Ionicons name="chatbubble-outline" size={18} color={T.subText} />
          <Text style={S.bt}>Comment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => sharePost(post.id)}>
          <Ionicons name="repeat-outline" size={18} color={T.subText} />
          <Text style={S.bt}>Echo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => likePost(post.id)}>
          <Ionicons name="heart-outline" size={18} color={T.subText} />
          <Text style={S.bt}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => toggleBookmark(post.id)}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={bookmarked ? T.accent : T.subText} />
          <Text style={[S.bt, bookmarked && { color: T.accent }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  card: { backgroundColor: T.bg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
          borderBottomWidth: 1, borderBottomColor: T.divider, marginBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  av: { width: 42, height: 42, borderRadius: 21, backgroundColor: T.surface,
        borderWidth: 1.5, borderColor: T.accent, marginRight: 10,
        alignItems: 'center', justifyContent: 'center' },
  avT: { color: T.accent, fontWeight: '900', fontSize: 16 },
  nm: { color: T.text, fontWeight: '700', fontSize: 15 },
  hd: { color: T.subText, fontSize: 12.5 },
  dot: { color: T.muted, fontSize: 12.5 },
  ct: { color: T.text, fontSize: 15.5, lineHeight: 22, marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: T.danger,
               alignItems: 'center', justifyContent: 'center' },
  statT: { color: T.subText, fontSize: 12.5 },
  divider: { height: 1, backgroundColor: T.divider, marginVertical: 8 },
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 4 },
  b: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  bt: { color: T.subText, fontSize: 13, fontWeight: '600' }
});
