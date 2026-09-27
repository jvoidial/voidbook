import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function PostCard({ post, user }) {
  const { user: me } = useAuth();
  const { deletePost, likePost } = useApp();
  const mins = Math.floor((Date.now() - post.ts) / 60000);
  
  const renderContent = (content) => {
    const parts = content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#')) return <Text key={i} style={{color:T.accent}}>{part}</Text>;
      return <Text key={i}>{part}</Text>;
    });
  };

  return (
    <View style={S.card}>
      <View style={S.head}>
        <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
            <Text style={S.nm}>{user?.name || 'Unknown'}</Text>
            <Ionicons name="checkmark-circle" size={14} color={T.accent} />
            <Text style={S.hd}>@{user?.handle?.replace('@','') || 'unknown'} · {mins}m</Text>
          </View>
          <Text style={S.ct}>{renderContent(post.content)}</Text>
        </View>
        {me?.id === post.userId && (
          <TouchableOpacity onPress={() => deletePost(post.id)}>
            <Ionicons name="trash-outline" size={16} color={T.danger} />
          </TouchableOpacity>
        )}
      </View>
      <View style={S.bar}>
        <TouchableOpacity style={S.b}><Ionicons name="chatbubble-outline" size={18} color={T.muted} /><Text style={S.bt}>{post.comments?.length || 0}</Text></TouchableOpacity>
        <TouchableOpacity style={S.b}><Ionicons name="repeat-outline" size={18} color={T.muted} /><Text style={S.bt}>{post.shares || 0}</Text></TouchableOpacity>
        <TouchableOpacity style={S.b} onPress={() => likePost(post.id)}><Ionicons name="heart-outline" size={18} color={T.muted} /><Text style={S.bt}>{post.likes || 0}</Text></TouchableOpacity>
        <TouchableOpacity style={S.b}><Ionicons name="share-outline" size={18} color={T.muted} /></TouchableOpacity>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  card: { padding:16, borderBottomWidth:1, borderBottomColor:T.border, backgroundColor:T.bg },
  head: { flexDirection:'row', alignItems:'flex-start', marginBottom:8 },
  av: { width:42, height:42, borderRadius:21, backgroundColor:T.surface, borderWidth:1, borderColor:T.border, marginRight:12, alignItems:'center', justifyContent:'center' },
  avT: { color:T.accent, fontWeight:'900', fontSize:16 },
  nm: { color:T.text, fontWeight:'bold', fontSize:15 },
  hd: { color:T.muted, fontSize:14 },
  ct: { color:T.text, fontSize:15, lineHeight:22, marginTop:4 },
  bar: { flexDirection:'row', justifyContent:'space-between', paddingRight:40, marginTop:12 },
  b: { flexDirection:'row', alignItems:'center', gap:6 },
  bt: { color:T.muted, fontSize:13 }
});
