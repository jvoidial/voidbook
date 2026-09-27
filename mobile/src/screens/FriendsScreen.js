import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function FriendsScreen() {
  const { state, acceptFriend, rejectFriend } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const requests = state.friends.requests.map(r => ({ ...r, user: usersById[r.userId] }));
  const friends = state.friends.friends.map(id => usersById[id]);

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Friends</Text></View>
      <FlatList data={[{ type:'head' }, ...friends.map(f => ({ type:'f', f }))]}
        keyExtractor={(i, idx) => i.type + (i.f?.id || idx)}
        renderItem={({ item }) => {
          if (item.type === 'head') return (
            <View>
              <Text style={S.sec}>Friend Requests</Text>
              {requests.length === 0 && <Text style={S.empty}>No pending requests</Text>}
              {requests.map(r => (
                <View key={r.id} style={S.row}>
                  <View style={S.av} />
                  <View style={{ flex:1 }}>
                    <Text style={S.nm}>{r.user?.name}</Text>
                    <Text style={S.hd}>{r.user?.handle}</Text>
                  </View>
                  <TouchableOpacity style={S.accept} onPress={() => acceptFriend(r.id)}>
                    <Text style={S.acceptT}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.reject} onPress={() => rejectFriend(r.id)}>
                    <Text style={S.rejectT}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={S.sec}>All Friends ({friends.length})</Text>
            </View>
          );
          return (
            <View style={S.row}>
              <View style={S.av} />
              <View style={{ flex:1 }}>
                <Text style={S.nm}>{item.f?.name}</Text>
                <Text style={S.hd}>{item.f?.bio}</Text>
              </View>
            </View>
          );
        }} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  sec: { color:T.muted, fontSize:12, textTransform:'uppercase', padding:16, paddingBottom:8 },
  empty: { color:T.muted, padding:16 },
  row: { flexDirection:'row', alignItems:'center', padding:16,
         borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:44, height:44, borderRadius:22, backgroundColor:T.surface,
        borderWidth:1, borderColor:T.border, marginRight:12 },
  nm: { color:T.text, fontWeight:'bold' },
  hd: { color:T.muted, fontSize:12 },
  accept: { backgroundColor:T.accent, paddingHorizontal:14, paddingVertical:8,
            borderRadius:16, marginRight:6 },
  acceptT: { color:'#000', fontWeight:'bold', fontSize:12 },
  reject: { backgroundColor:T.surface, paddingHorizontal:12, paddingVertical:8,
            borderRadius:16, borderWidth:1, borderColor:T.border },
  rejectT: { color:T.text }
});
