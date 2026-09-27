import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme as T } from '../theme';

export default function PostCard({ post, user, onLike, onShare }) {
  const mins = Math.floor((Date.now() - post.ts) / 60000);
  return (
    <View style={S.card}>
      <View style={S.head}>
        <View style={S.av} />
        <View style={{ flex: 1 }}>
          <Text style={S.nm}>{user?.name || 'Unknown'}</Text>
          <Text style={S.hd}>{user?.handle} · {mins}m</Text>
        </View>
      </View>
      <Text style={S.ct}>{post.content}</Text>
      <View style={S.bar}>
        <TouchableOpacity onPress={onLike} style={S.b}>
          <Text style={S.bt}>❤️ {post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.b}>
          <Text style={S.bt}>💬 {post.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={S.b}>
          <Text style={S.bt}>📤 {post.shares}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  card: { padding:16, borderBottomWidth:1, borderBottomColor:T.border, backgroundColor:T.bg },
  head: { flexDirection:'row', alignItems:'center', marginBottom:10 },
  av: { width:42, height:42, borderRadius:21, backgroundColor:T.surface,
        borderWidth:1, borderColor:T.border, marginRight:12 },
  nm: { color:T.text, fontWeight:'bold', fontSize:15 },
  hd: { color:T.muted, fontSize:12 },
  ct: { color:T.text, fontSize:15, lineHeight:22, marginBottom:12 },
  bar: { flexDirection:'row', justifyContent:'space-around',
         borderTopWidth:1, borderTopColor:T.border, paddingTop:10 },
  b: { padding:6 },
  bt: { color:T.muted, fontSize:13 }
});
