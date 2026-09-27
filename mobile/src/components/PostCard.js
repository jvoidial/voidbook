import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function PostCard({ post, user }) {
  const { user: me } = useAuth();
  const { deletePost, likePost, sharePost, addComment, state } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const mins = Math.floor((Date.now() - post.ts) / 60000);
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const renderContent = (c) => c.split(/(\s+)/).map((part, i) =>
    part.startsWith('#') ? <Text key={i} style={{ color: T.accent }}>{part}</Text> : part
  );

  const submitComment = () => {
    if (!comment.trim()) return;
    addComment(post.id, comment);
    setComment('');
  };

  return (
    <View style={S.card}>
      <View style={S.head}>
        <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Text style={S.nm}>{user?.name || 'Unknown'}</Text>
            <Ionicons name="checkmark-circle" size={13} color={T.accent} />
            <Text style={S.hd}>@{user?.handle?.replace('@','')} · {mins}m</Text>
          </View>
          <Text style={S.ct}>{renderContent(post.content)}</Text>
        </View>
        {me?.id === post.userId && (
          <TouchableOpacity onPress={() => Alert.alert('Delete post?', '', [
            { text:'Cancel', style:'cancel' },
            { text:'Delete', style:'destructive', onPress:() => deletePost(post.id) }
          ])}>
            <Ionicons name="trash-outline" size={16} color={T.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={S.bar}>
        <TouchableOpacity style={S.b} onPress={() => setShowComments(s => !s)}>
          <Ionicons name="chatbubble-outline" size={17} color={T.muted} />
          <Text style={S.bt}>{post.comments?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => sharePost(post.id)}>
          <Ionicons name="repeat-outline" size={17} color={T.muted} />
          <Text style={S.bt}>{post.shares || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => likePost(post.id)}>
          <Ionicons name="heart-outline" size={17} color={T.muted} />
          <Text style={S.bt}>{post.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => Alert.alert('Link copied', 'Share VOIDBOOK')}>
          <Ionicons name="share-outline" size={17} color={T.muted} />
        </TouchableOpacity>
      </View>

      {showComments && (
        <View style={S.commentsBox}>
          {post.comments?.map(c => {
            const u = usersById[c.userId] || { name: 'You' };
            return (
              <View key={c.id} style={S.commentRow}>
                <Text style={S.commentName}>{u.name}:</Text>
                <Text style={S.commentText}>{c.text}</Text>
              </View>
            );
          })}
          <View style={S.commentInputRow}>
            <TextInput style={S.commentInput} placeholder="Add a comment..."
              placeholderTextColor={T.muted} value={comment} onChangeText={setComment} />
            <TouchableOpacity onPress={submitComment}>
              <Ionicons name="send" size={18} color={T.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  card: { padding:16, borderBottomWidth:1, borderBottomColor:T.border, backgroundColor:T.bg },
  head: { flexDirection:'row', alignItems:'flex-start', marginBottom:8 },
  av: { width:42, height:42, borderRadius:21, backgroundColor:T.surface, borderWidth:1,
        borderColor:T.border, marginRight:12, alignItems:'center', justifyContent:'center' },
  avT: { color:T.accent, fontWeight:'900', fontSize:16 },
  nm: { color:T.text, fontWeight:'bold', fontSize:15 },
  hd: { color:T.muted, fontSize:13 },
  ct: { color:T.text, fontSize:15, lineHeight:22, marginTop:4 },
  bar: { flexDirection:'row', justifyContent:'space-between', paddingRight:40, marginTop:12 },
  b: { flexDirection:'row', alignItems:'center', gap:6 },
  bt: { color:T.muted, fontSize:13 },
  commentsBox: { marginTop:12, paddingTop:12, borderTopWidth:1, borderTopColor:T.border },
  commentRow: { flexDirection:'row', marginBottom:6, gap:6 },
  commentName: { color:T.accent, fontWeight:'700', fontSize:13 },
  commentText: { color:T.text, fontSize:13, flex:1 },
  commentInputRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop:8,
    backgroundColor:T.surface, borderRadius:20, paddingHorizontal:12, paddingVertical:6,
    borderWidth:1, borderColor:T.border },
  commentInput: { flex:1, color:T.text, fontSize:14 }
});
