import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function WatchScreen() {
  const { state } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Watch</Text></View>
      <FlatList data={state.watch} keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.thumb}><Text style={S.play}>▶</Text></View>
            <Text style={S.nm}>{item.title}</Text>
            <Text style={S.hd}>
              {usersById[item.userId]?.name} · {item.views.toLocaleString()} views
            </Text>
          </View>
        )} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  card: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  thumb: { height:180, backgroundColor:T.surface, borderRadius:12,
           borderWidth:1, borderColor:T.border, alignItems:'center',
           justifyContent:'center', marginBottom:10 },
  play: { color:T.accent, fontSize:42 },
  nm: { color:T.text, fontWeight:'bold', fontSize:15 },
  hd: { color:T.muted, fontSize:12, marginTop:4 }
});
