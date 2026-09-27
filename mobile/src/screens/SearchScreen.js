import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function SearchScreen() {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const results = query.trim() ? state.posts.filter(p => p.content.toLowerCase().includes(query.toLowerCase())) : [];

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <View style={S.searchBox}>
          <Ionicons name="search" size={18} color={T.muted} />
          <TextInput style={S.input} placeholder="Search VOID" placeholderTextColor={T.muted} value={query} onChangeText={setQuery} />
          {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={T.muted} /></TouchableOpacity>}
        </View>
      </View>
      {query ? (
        <FlatList
          data={results}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={S.result}>
              <Text style={S.resT}>{item.content}</Text>
              <Text style={S.resM}>{item.likes} likes</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={S.empty}>No results for "{query}"</Text>}
        />
      ) : (
        <View style={S.trends}>
          <Text style={S.trendTitle}>Trends for you</Text>
          {['#VOIDBOOK', '#ReactNative', '#JVOIDIAL', '#BuildInPublic'].map((t, i) => (
            <TouchableOpacity key={i} style={S.trend} onPress={() => setQuery(t)}>
              <Text style={S.trendT}>{t}</Text>
              <Text style={S.trendS}>{(i+1)*1.2}K posts</Text>
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
  searchBox: { flexDirection:'row', alignItems:'center', backgroundColor:T.surface, borderRadius:20, paddingHorizontal:12, height:40, borderWidth:1, borderColor:T.border },
  input: { flex:1, color:T.text, marginLeft:8, fontSize:15 },
  trends: { padding:16 },
  trendTitle: { color:T.text, fontSize:18, fontWeight:'800', marginBottom:16 },
  trend: { marginBottom:20 },
  trendT: { color:T.accent, fontSize:16, fontWeight:'700' },
  trendS: { color:T.muted, fontSize:13, marginTop:2 },
  result: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  resT: { color:T.text, fontSize:15 },
  resM: { color:T.muted, fontSize:12, marginTop:4 },
  empty: { color:T.muted, textAlign:'center', marginTop:40 }
});
