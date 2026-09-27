import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function MarketplaceScreen() {
  const { state } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Marketplace</Text></View>
      <FlatList data={state.listings} keyExtractor={i => i.id} numColumns={2}
        columnWrapperStyle={{ gap:8, paddingHorizontal:12 }}
        contentContainerStyle={{ gap:8, paddingVertical:12 }}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.img} />
            <Text style={S.price}>${item.price}</Text>
            <Text style={S.nm} numberOfLines={1}>{item.title}</Text>
            <Text style={S.hd} numberOfLines={1}>by {usersById[item.sellerId]?.name}</Text>
          </View>
        )} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  card: { flex:1, backgroundColor:T.surface, borderRadius:12, padding:10,
          borderWidth:1, borderColor:T.border },
  img: { height:110, backgroundColor:T.card, borderRadius:8, marginBottom:8 },
  price: { color:T.accent, fontWeight:'bold', fontSize:15 },
  nm: { color:T.text, fontWeight:'600', marginTop:2 },
  hd: { color:T.muted, fontSize:11 }
});
