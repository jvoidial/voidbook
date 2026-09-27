import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  const { state, addComment, likePost, sharePost, deletePost, toggleBookmark } = useApp();
  const { user: me } = useAuth();
  const [text, setText] = useState('');
  const post = state.posts.find(p => p.id === postId);
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  if (!post) {
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color={T.text} />
          </TouchableOpacity>
          <Text style={S.title}>Post</Text>
          <View style={{ width: 26 }} />
        </View>
        <Text style={S.empty}>Post deleted.</Text>
      </SafeAreaView>
    );
  }

  const author = usersById[post.userId] || { name: 'You', handle: '@you' };
  const bookmarked = state.bookmarks.includes(post.id);
  const renderContent = (c) => (c || '').split(/(\s+)/).map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@')) return <Text key={i} style={{ color: T.accent, fontWeight: '600' }}>{part}</Text>;
    return part;
  });

  const submit = () => { if (!text.trim()) return; addComment(post.id, text); setText(''); };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={S.title}>Post</Text>
        <TouchableOpacity onPress={() => Alert.alert('Options', '', [
          ...(me?.id === post.userId ? [{ text:'Delete', style:'destructive', onPress:() => { deletePost(post.id); navigation.goBack(); } }] : []),
          { text: 'Report', onPress: () => Alert.alert('Reported') },
          { text: 'Cancel', style: 'cancel' }
        ])}>
          <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={post.comments || []}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <View style={S.postBlock}>
            <View style={S.headRow}>
              <View style={S.av}><Text style={S.avT}>{author.name[0]}</Text></View>
              <View>
                <Text style={S.nm}>{author.name}</Text>
                <Text style={S.hd}>{author.handle}</Text>
              </View>
            </View>
            <Text style={S.bigContent}>{renderContent(post.content)}</Text>
            <Text style={S.time}>{new Date(post.ts).toLocaleString()}</Text>

            <View style={S.statsRow}>
              <Text style={S.stat}><Text style={{ color: T.text, fontWeight: '700' }}>{post.likes}</Text> Likes</Text>
              <Text style={S.stat}><Text style={{ color: T.text, fontWeight: '700' }}>{post.shares}</Text> Echoes</Text>
              <Text style={S.stat}><Text style={{ color: T.text, fontWeight: '700' }}>{(post.comments||[]).length}</Text> Comments</Text>
            </View>

            <View style={S.bar}>
              <TouchableOpacity style={S.barBtn} onPress={() => likePost(post.id)}>
                <Ionicons name="heart-outline" size={20} color={T.subText} /><Text style={S.barBtnT}>Like</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.barBtn} onPress={() => sharePost(post.id)}>
                <Ionicons name="repeat-outline" size={20} color={T.subText} /><Text style={S.barBtnT}>Echo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.barBtn} onPress={() => toggleBookmark(post.id)}>
                <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={bookmarked ? T.accent : T.subText} />
                <Text style={S.barBtnT}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.barBtn} onPress={() => Alert.alert('Report', 'Report submitted')}>
                <Ionicons name="flag-outline" size={20} color={T.subText} /><Text style={S.barBtnT}>Report</Text>
              </TouchableOpacity>
            </View>

            <Text style={S.sectionLabel}>Comments ({(post.comments||[]).length})</Text>
          </View>
        }
        renderItem={({ item }) => {
          const u = usersById[item.userId] || { name: 'You', handle: '@you' };
          return (
            <View style={S.commentRow}>
              <View style={S.cAv}><Text style={S.cAvT}>{u.name[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={S.cName}>{u.name} <Text style={S.cHandle}>{u.handle}</Text></Text>
                <Text style={S.cText}>{item.text}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={S.emptyC}>No comments yet. Be the first.</Text>}
      />

      <View style={S.inputRow}>
        <View style={S.myAv}><Text style={S.myAvT}>{(me?.name || '?')[0]?.toUpperCase()}</Text></View>
        <TextInput style={S.input} placeholder="Add a comment..." placeholderTextColor={T.muted}
          value={text} onChangeText={setText} multiline />
        <TouchableOpacity style={S.send} onPress={submit}>
          <Ionicons name="send" size={16} color="#000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  postBlock: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  av: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.accent, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  avT: { color: T.accent, fontWeight: '900', fontSize: 18 },
  nm: { color: T.text, fontWeight: '700', fontSize: 15 },
  hd: { color: T.subText, fontSize: 13 },
  bigContent: { color: T.text, fontSize: 18, lineHeight: 26 },
  time: { color: T.muted, fontSize: 12, marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 20, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.divider },
  stat: { color: T.subText, fontSize: 13 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: T.divider, marginTop: 12 },
  barBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barBtnT: { color: T.subText, fontSize: 13, fontWeight: '600' },
  sectionLabel: { color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 20 },
  commentRow: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider, gap: 10 },
  cAv: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  cAvT: { color: T.accent, fontWeight: '900', fontSize: 13 },
  cName: { color: T.text, fontWeight: '700', fontSize: 14 },
  cHandle: { color: T.muted, fontWeight: '400', fontSize: 12 },
  cText: { color: T.text, fontSize: 14, marginTop: 4, lineHeight: 20 },
  empty: { color: T.muted, textAlign: 'center', marginTop: 40 },
  emptyC: { color: T.muted, textAlign: 'center', padding: 40 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: T.divider, gap: 10 },
  myAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  myAvT: { color: T.accent, fontWeight: '900', fontSize: 13 },
  input: { flex: 1, backgroundColor: T.surface, color: T.text, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: T.border, maxHeight: 100 },
  send: { backgroundColor: T.accent, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }
});
