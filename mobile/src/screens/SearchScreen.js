import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function SearchScreen() {
  const { state } = useApp();
  const [q, setQ] = useState('');
  const posts = q.trim() ? state.posts.filter(p => p.content.toLowerCase().includes(q.toLowerCase())) : [];
  const users = q.trim() ? state.users.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.handle.toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <View style={S.searchBox}>
          <Ionicons name="search" size={18} color={T.muted} />
          <TextInput style={S.input} placeholder="Search VOIDBOOK"
            placeholderTextColor={T.muted} value={q} onChangeText={setQ} />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={18} color={T.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {q ? (
        <FlatList
          ListHeaderComponent={
            users.length > 0 ? <Text style={S.secTitle}>People</Text> : null
          }
          data={[...users.map(u => ({ type:'user', ...u })),
                 ...posts.map(p => ({ type:'post', ...p }))]}
          keyExtractor={(i, idx) => i.type + (i.id || idx)}
          renderItem={({ item }) => item.type === 'user' ? (
            <View style={S.userRow}>
              <View style={S.av}><Text style={S.avT}>{item.name[0]}</Text></View>
              <View>
                <Text style={S.nm}>{item.name}</Text>
                <Text style={S.hd}>{item.handle}</Text>
              </View>
            </View>
          ) : (
            <View style={S.postRow}>
              <Text style={S.postT}>{item.content}</Text>
              <Text style={S.postM}>{item.likes} likes</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={S.empty}>No results for "{q}"</Text>}
        />
      ) : (
        <View style={S.trends}>
          <Text style={S.trendTitle}>Trends for you</Text>
          {['#VOIDBOOK', '#ReactNative', '#JVOIDIAL', '#BuildInPublic', '#Crypto', '#AItools'].map((t, i) => (
            <TouchableOpacity key={i} style={S.trend} onPress={() => setQ(t)}>
              <Text style={S.trendT}>{t}</Text>
              <Text style={S.trendS}>{((i+1)*1.2).toFixed(1)}K posts</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:12, borderBottomWidth:1, borderBottomColor:T.border },
  searchBox: { flexDirection:'row', alignItems:'center', backgroundColor:T.surface,
    borderRadius:20, paddingHorizontal:12, height:42, borderWidth:1, borderColor:T.border },
  input: { flex:1, color:T.text, marginLeft:8, fontSize:15 },
  trends: { padding:16 },
  trendTitle: { color:T.text, fontSize:18, fontWeight:'800', marginBottom:16 },
  trend: { marginBottom:20 },
  trendT: { color:T.accent, fontSize:16, fontWeight:'700' },
  trendS: { color:T.muted, fontSize:13, marginTop:2 },
  secTitle: { color:T.muted, fontSize:12, textTransform:'uppercase', padding:16, paddingBottom:8 },
  userRow: { flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:44, height:44, borderRadius:22, backgroundColor:T.surface,
        alignItems:'center', justifyContent:'center', marginRight:12,
        borderWidth:1, borderColor:T.border },
  avT: { color:T.accent, fontWeight:'900', fontSize:16 },
  nm: { color:T.text, fontWeight:'bold' },
  hd: { color:T.muted, fontSize:12 },
  postRow: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  postT: { color:T.text, fontSize:15 },
  postM: { color:T.muted, fontSize:12, marginTop:4 },
  empty: { color:T.muted, textAlign:'center', marginTop:40 }
});
