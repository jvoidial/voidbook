import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function ProfileScreen() {
  const { state } = useApp();
  const me = state.user;
  const mine = state.posts.filter(p => p.userId === 'me');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <FlatList data={mine} keyExtractor={i => i.id}
        ListHeaderComponent={
          <View style={S.head}>
            <View style={S.bigAv} />
            <Text style={S.nm}>{me.name}</Text>
            <Text style={S.hd}>{me.handle}</Text>
            <Text style={S.bio}>{me.bio}</Text>
            <View style={S.stats}>
              <View style={S.stat}><Text style={S.num}>{mine.length}</Text><Text style={S.lbl}>Posts</Text></View>
              <View style={S.stat}><Text style={S.num}>{me.friends.length}</Text><Text style={S.lbl}>Friends</Text></View>
              <View style={S.stat}><Text style={S.num}>{state.friends.requests.length}</Text><Text style={S.lbl}>Requests</Text></View>
            </View>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  head: { padding:24, alignItems:'center', borderBottomWidth:1, borderBottomColor:T.border },
  bigAv: { width:90, height:90, borderRadius:45, backgroundColor:T.surface,
           borderWidth:2, borderColor:T.accent, marginBottom:12 },
  nm: { color:T.text, fontSize:22, fontWeight:'800' },
  hd: { color:T.muted, fontSize:14 },
  bio: { color:T.text, fontSize:13, marginTop:8, textAlign:'center' },
  stats: { flexDirection:'row', marginTop:20, gap:32 },
  stat: { alignItems:'center' },
  num: { color:T.accent, fontSize:20, fontWeight:'800' },
  lbl: { color:T.muted, fontSize:12 }
});
