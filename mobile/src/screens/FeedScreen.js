import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function FeedScreen() {
  const { state, addPost, likePost, sharePost } = useApp();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const submit = () => { if (!text.trim()) return; addPost(text); setText(''); };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.logo}>VOID<Text style={{ color: T.accent }}>BOOK</Text></Text>
        <Ionicons name="sparkles-outline" size={22} color={T.accent} />
      </View>

      <FlatList
        data={state.posts}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={S.stories} contentContainerStyle={{ paddingHorizontal: 12 }}>
              <View style={S.story}>
                <View style={[S.storyAv, { borderColor: T.border }]}>
                  <Ionicons name="add" size={26} color={T.accent} />
                </View>
                <Text style={S.storyNm}>Create</Text>
              </View>
              {state.stories.map(s => {
                const u = usersById[s.userId];
                return (
                  <View key={s.id} style={S.story}>
                    <View style={S.storyAv}><Text style={S.storyAvT}>{u?.name?.[0]}</Text></View>
                    <Text style={S.storyNm} numberOfLines={1}>{u?.name}</Text>
                  </View>
                );
              })}
            </ScrollView>

            <View style={S.composer}>
              <View style={S.composerRow}>
                <View style={S.myAv}><Text style={S.myAvT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
                <TextInput style={S.input} placeholder="What is happening?!"
                  placeholderTextColor={T.muted} multiline value={text} onChangeText={setText} />
              </View>
              <View style={S.composerActions}>
                <View style={{ flexDirection:'row', gap:16 }}>
                  <Ionicons name="image-outline" size={20} color={T.accent} />
                  <Ionicons name="gif-outline" size={20} color={T.accent} />
                  <Ionicons name="location-outline" size={20} color={T.accent} />
                </View>
                <TouchableOpacity style={[S.postBtn, !text.trim() && { opacity: 0.4 }]}
                  disabled={!text.trim()} onPress={submit}>
                  <Text style={S.postBtnT}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} onLike={() => likePost(item.id)} onShare={() => sharePost(item.id)} />}
      />

      <TouchableOpacity style={S.fab} onPress={() => {}}>
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
         paddingHorizontal:16, paddingVertical:12,
         borderBottomWidth:1, borderBottomColor:T.border },
  logo: { color:T.text, fontSize:22, fontWeight:'900', letterSpacing:-0.5 },
  stories: { borderBottomWidth:1, borderBottomColor:T.border, paddingVertical:12 },
  story: { alignItems:'center', marginRight:14, width:70 },
  storyAv: { width:60, height:60, borderRadius:30, backgroundColor:T.surface,
             borderWidth:2, borderColor:T.accent, marginBottom:6,
             alignItems:'center', justifyContent:'center' },
  storyAvT: { color:T.accent, fontWeight:'900', fontSize:22 },
  storyNm: { color:T.text, fontSize:11 },
  composer: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  composerRow: { flexDirection:'row', alignItems:'flex-start' },
  myAv: { width:40, height:40, borderRadius:20, backgroundColor:T.surface,
          alignItems:'center', justifyContent:'center', marginRight:12 },
  myAvT: { color:T.accent, fontWeight:'900', fontSize:14 },
  input: { flex:1, color:T.text, fontSize:17, minHeight:50, textAlignVertical:'top' },
  composerActions: { flexDirection:'row', justifyContent:'space-between',
                     alignItems:'center', marginTop:8, paddingLeft:52 },
  postBtn: { backgroundColor:T.accent, paddingHorizontal:20, paddingVertical:8, borderRadius:20 },
  postBtnT: { color:'#000', fontWeight:'800' },
  fab: { position:'absolute', bottom:80, right:20, width:56, height:56, borderRadius:28,
         backgroundColor:T.accent, alignItems:'center', justifyContent:'center', elevation:6 }
});
