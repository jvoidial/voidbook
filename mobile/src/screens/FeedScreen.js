import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function FeedScreen() {
  const { state, addPost, likePost, sharePost } = useApp();
  const [text, setText] = useState('');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const stories = state.stories.map(s => ({ ...s, user: usersById[s.userId] }));

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.logo}>VOID<Text style={S.accent}>BOOK</Text></Text></View>
      <FlatList
        data={state.posts}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={S.stories} contentContainerStyle={{ paddingHorizontal:16 }}>
              {stories.map(s => (
                <View key={s.id} style={S.story}>
                  <View style={S.storyAv} />
                  <Text style={S.storyNm} numberOfLines={1}>{s.user?.name}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={S.comp}>
              <TextInput style={S.input} placeholder="What's on your mind?"
                placeholderTextColor={T.muted} value={text} onChangeText={setText} multiline />
              <TouchableOpacity style={S.btn}
                onPress={() => { if (text.trim()) { addPost(text); setText(''); } }}>
                <Text style={S.btnT}>Post</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PostCard post={item} user={usersById[item.userId]}
            onLike={() => likePost(item.id)} onShare={() => sharePost(item.id)} />
        )}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border, alignItems:'center' },
  logo: { fontSize:22, fontWeight:'800', color:T.text },
  accent: { color:T.accent },
  stories: { borderBottomWidth:1, borderBottomColor:T.border, paddingVertical:12 },
  story: { alignItems:'center', marginRight:14, width:70 },
  storyAv: { width:60, height:60, borderRadius:30, backgroundColor:T.surface,
             borderWidth:2, borderColor:T.accent, marginBottom:6 },
  storyNm: { color:T.text, fontSize:11 },
  comp: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  input: { backgroundColor:T.surface, color:T.text, padding:12, borderRadius:16,
           borderWidth:1, borderColor:T.border, minHeight:44 },
  btn: { backgroundColor:T.accent, paddingVertical:10, borderRadius:20,
         marginTop:10, alignItems:'center' },
  btnT: { color:'#000', fontWeight:'bold' }
});
