import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function ProfileScreen() {
  const { user, signOut, updateProfile } = useAuth();
  const { state } = useApp();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    handle: user?.handle || '',
    bio: user?.bio || ''
  });
  const mine = state.posts.filter(p => p.userId === (user?.id || 'me'));
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const save = () => {
    if (!form.name.trim()) return Alert.alert('Name required');
    updateProfile(form);
    setEdit(false);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.topBar}>
        <Text style={S.title}>Profile</Text>
        <View style={{ flexDirection:'row', gap:16 }}>
          <TouchableOpacity onPress={() => {
            setForm({ name:user?.name||'', handle:user?.handle||'', bio:user?.bio||'' });
            setEdit(true);
          }}>
            <Ionicons name="create-outline" size={22} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Sign Out?', '', [
            { text:'Cancel', style:'cancel' },
            { text:'Sign Out', style:'destructive', onPress:signOut }
          ])}>
            <Ionicons name="log-out-outline" size={22} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList data={mine} keyExtractor={i => i.id}
        ListHeaderComponent={
          <View style={S.head}>
            <View style={S.bigAv}><Text style={S.bigAvT}>{(user?.name || '?')[0].toUpperCase()}</Text></View>
            <Text style={S.nm}>{user?.name}</Text>
            <Text style={S.hd}>{user?.handle}</Text>
            <Text style={S.bio}>{user?.bio}</Text>
            <View style={S.stats}>
              <View style={S.stat}><Text style={S.num}>{mine.length}</Text><Text style={S.lbl}>Posts</Text></View>
              <View style={S.div} />
              <View style={S.stat}><Text style={S.num}>{user?.friends?.length || 0}</Text><Text style={S.lbl}>Friends</Text></View>
              <View style={S.div} />
              <View style={S.stat}><Text style={S.num}>{state.friends.requests.length}</Text><Text style={S.lbl}>Requests</Text></View>
            </View>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId] || user} />}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="cube-outline" size={40} color={T.muted} />
            <Text style={S.emptyT}>Nothing posted yet</Text>
          </View>
        } />

      <Modal visible={edit} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Edit Profile</Text>
            <TextInput style={S.in} placeholder="Name" placeholderTextColor={T.muted}
              value={form.name} onChangeText={t => setForm({...form, name:t})} />
            <TextInput style={S.in} placeholder="Handle" placeholderTextColor={T.muted}
              value={form.handle} onChangeText={t => setForm({...form, handle:t})} />
            <TextInput style={[S.in, { height:80 }]} placeholder="Bio" placeholderTextColor={T.muted}
              multiline value={form.bio} onChangeText={t => setForm({...form, bio:t})} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setEdit(false)}>
                <Text style={S.cancelT}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.go} onPress={save}>
                <Text style={S.goT}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
            paddingHorizontal:16, paddingVertical:12,
            borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  head: { padding:24, alignItems:'center', borderBottomWidth:1, borderBottomColor:T.border },
  bigAv: { width:96, height:96, borderRadius:48, backgroundColor:T.surface,
           borderWidth:2, borderColor:T.accent, marginBottom:12,
           alignItems:'center', justifyContent:'center' },
  bigAvT: { color:T.accent, fontSize:36, fontWeight:'900' },
  nm: { color:T.text, fontSize:22, fontWeight:'900' },
  hd: { color:T.muted, fontSize:14, marginTop:2 },
  bio: { color:T.text, fontSize:13, marginTop:10, textAlign:'center' },
  stats: { flexDirection:'row', marginTop:24, alignItems:'center' },
  stat: { alignItems:'center', paddingHorizontal:20 },
  num: { color:T.accent, fontSize:20, fontWeight:'800' },
  lbl: { color:T.muted, fontSize:12, marginTop:2 },
  div: { width:1, height:24, backgroundColor:T.border },
  empty: { padding:48, alignItems:'center', gap:8 },
  emptyT: { color:T.muted, fontSize:13 },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'center', padding:24 },
  modal: { backgroundColor:T.surface, borderRadius:20, padding:24, borderWidth:1, borderColor:T.border },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  in: { backgroundColor:T.bg, color:T.text, padding:14, borderRadius:12,
        borderWidth:1, borderColor:T.border, marginBottom:12 },
  modalActions: { flexDirection:'row', gap:12, marginTop:8 },
  cancel: { flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' },
  go: { flex:1, padding:14, borderRadius:12, backgroundColor:T.accent, alignItems:'center' },
  goT: { color:'#000', fontWeight:'800' }
});
