import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function FeedScreen() {
  const { state, addPost } = useApp();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  
  const submit = () => {
    if (!text.trim()) return;
    addPost(text);
    setText('');
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
        <Text style={S.logo}>VOID<Text style={{color:T.accent}}>X</Text></Text>
        <TouchableOpacity><Ionicons name="settings-outline" size={22} color={T.text} /></TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex:1}}>
        <FlatList
          data={state.posts}
          keyExtractor={i => i.id}
          ListHeaderComponent={
            <View style={S.composer}>
              <TextInput
                style={S.input}
                placeholder="What is happening?!"
                placeholderTextColor={T.muted}
                multiline
                value={text}
                onChangeText={setText}
              />
              {text.length > 0 && (
                <View style={S.composerActions}>
                  <Ionicons name="image-outline" size={22} color={T.accent} />
                  <Ionicons name="gif-outline" size={22} color={T.accent} />
                  <TouchableOpacity style={S.postBtn} onPress={submit}>
                    <Text style={S.postBtnT}>Post</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <PostCard post={item} user={usersById[item.userId]} />
          )}
        />
      </KeyboardAvoidingView>

      <TouchableOpacity style={S.fab}>
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:32, height:32, borderRadius:16, backgroundColor:T.surface, alignItems:'center', justifyContent:'center' },
  avT: { color:T.accent, fontWeight:'900', fontSize:12 },
  logo: { color:T.text, fontSize:20, fontWeight:'900' },
  composer: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  input: { color:T.text, fontSize:18, minHeight:60, textAlignVertical:'top' },
  composerActions: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:12 },
  postBtn: { backgroundColor:T.accent, paddingHorizontal:20, paddingVertical:8, borderRadius:20 },
  postBtnT: { color:'#000', fontWeight:'800' },
  fab: { position:'absolute', bottom:20, right:20, width:56, height:56, borderRadius:28, backgroundColor:T.accent, alignItems:'center', justifyContent:'center', elevation:4, shadowColor:'#000', shadowOpacity:0.5, shadowRadius:8 }
});
