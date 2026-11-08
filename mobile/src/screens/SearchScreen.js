import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

// PostgREST filter syntax uses , . ( ) and % as delimiters, so strip them from
// user input rather than trying to escape each one.
const clean = (s) => s.replace(/[%,()\\]/g, ' ').trim();

export default function SearchScreen() {
  const nav = useNavigation();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('people');
  const [people, setPeople] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = clean(q);
    if (term.length < 1) {
      setPeople([]); setPosts([]); setLoading(false); return;
    }
    setLoading(true);
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const like = `%${term}%`;
      const [p, o] = await Promise.all([
        supabase.from('profiles').select('*')
          .or(`handle.ilike.${like},name.ilike.${like}`)
          .limit(30),
        supabase.from('posts').select('*, author:profiles(*)')
          .ilike('content', like).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(30)
      ]);
      // Ignore responses that arrive after a newer keystroke.
      if (mine !== seq.current) return;
      setPeople(p.data || []);
      setPosts((o.data || []).map(x => ({ ...x, userId: x.author_id, ts: x.created_at })));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const term = clean(q);

  const header = (
    <View style={S.top}>
      <View style={S.searchBox}>
        <Ionicons name="search" size={18} color={T.muted} />
        <TextInput style={S.input} placeholder="Search sqawk"
          placeholderTextColor={T.muted} value={q} onChangeText={setQ}
          autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        {q.length > 0 && (
          <TouchableOpacity onPress={() => setQ('')}>
            <Ionicons name="close-circle" size={18} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>
      {term.length > 0 && (
        <View style={S.tabs}>
          {[['people', 'People'], ['posts', 'Posts']].map(([key, label]) => (
            <TouchableOpacity key={key} style={[S.tab, tab === key && S.tabActive]} onPress={() => setTab(key)}>
              <Text style={[S.tabT, tab === key && S.tabTActive]}>
                {label} ({(key === 'people' ? people : posts).length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (term.length === 0) {
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        {header}
        <View style={S.center}>
          <Ionicons name="search-outline" size={48} color={T.muted} />
          <Text style={S.emptyT}>Search for people or posts</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        {header}
        <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (tab === 'people') {
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        {header}
        <FlatList
          data={people}
          keyExtractor={i => i.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={S.userRow} onPress={() => nav.navigate('UserProfile', { userId: item.id })}>
              <View style={S.av}>
                {item.avatar_url
                  ? <Image source={{ uri: item.avatar_url }} style={S.avImg} />
                  : <Text style={S.avT}>{(item.name || '?')[0].toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <View style={S.nmRow}>
                  <Text style={S.nm} numberOfLines={1}>{item.name}</Text>
                  {item.verified && <Ionicons name="checkmark-circle" size={15} color={T.link} />}
                </View>
                <Text style={S.hd} numberOfLines={1}>@{item.handle}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={S.empty}>No people found for "{term}"</Text>}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      {header}
      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <PostCard post={item} user={item.author} />}
        ListEmptyComponent={<Text style={S.empty}>No posts found for "{term}"</Text>}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:12, borderBottomWidth:1, borderBottomColor:T.border },
  searchBox: { flexDirection:'row', alignItems:'center', backgroundColor:T.surface,
    borderRadius:20, paddingHorizontal:12, height:42, borderWidth:1, borderColor:T.border },
  input: { flex:1, color:T.text, marginLeft:8, fontSize:15 },
  tabs: { flexDirection:'row', marginTop:12 },
  tab: { flex:1, alignItems:'center', paddingVertical:10, borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive: { borderBottomColor:T.accent },
  tabT: { color:T.muted, fontSize:13, fontWeight:'600' },
  tabTActive: { color:T.text, fontWeight:'800' },
  center: { flex:1, alignItems:'center', justifyContent:'center', gap:12, paddingBottom:80 },
  emptyT: { color:T.muted, fontSize:15 },
  empty: { color:T.muted, textAlign:'center', marginTop:40, paddingHorizontal:24 },
  userRow: { flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:44, height:44, borderRadius:22, backgroundColor:T.surface,
        alignItems:'center', justifyContent:'center', marginRight:12,
        borderWidth:1, borderColor:T.border, overflow:'hidden' },
  avImg: { width:'100%', height:'100%' },
  avT: { color:T.text, fontWeight:'900', fontSize:16 },
  nmRow: { flexDirection:'row', alignItems:'center', gap:4 },
  nm: { color:T.text, fontWeight:'bold' },
  hd: { color:T.muted, fontSize:12 }
});

