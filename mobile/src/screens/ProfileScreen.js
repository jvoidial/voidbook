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
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', handle: user?.handle || '' });
  const mine = state.posts.filter(p => p.userId === (user?.id || 'me'));
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const saveProfile = () => {
    if (!form.name.trim()) return Alert.alert('Error', 'Name cannot be empty');
    updateProfile(form);
    setEditModal(false);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.topBar}>
        <Text style={S.title}>Profile</Text>
        <View style={{ flexDirection:'row', gap:16 }}>
          <TouchableOpacity onPress={() => setEditModal(true)}><Ionicons name="create-outline" size={22} color={T.text} /></TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text:'Cancel', style:'cancel' }, { text:'Sign Out', style:'destructive', onPress: signOut }])}>
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
              <View style={S.divider} />
              <View style={S.stat}><Text style={S.num}>{user?.friends?.length || 0}</Text><Text style={S.lbl}>Friends</Text></View>
            </View>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId] || user} />} />

      <Modal visible={editModal} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Edit Profile</Text>
            <TextInput style={S.in} placeholder="Name" placeholderTextColor={T.muted} value={form.name} onChangeText={t => setForm({...form, name:t})} />
            <TextInput style={S.in} placeholder="Handle" placeholderTextColor={T.muted} value={form.handle} onChangeText={t => setForm({...form, handle:t})} />
            <TextInput style={[S.in, { height: 80 }]} placeholder="Bio" placeholderTextColor={T.muted} multiline value={form.bio} onChangeText={t => setForm({...form, bio:t})} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setEditModal(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={S.goBtn} onPress={saveProfile}><Text style={S.goT}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  head: { padding:24, alignItems:'center', borderBottomWidth:1, borderBottomColor:T.border },
  bigAv: { width:96, height:96, borderRadius:48, backgroundColor:T.surface, borderWidth:2, borderColor:T.accent, marginBottom:12, alignItems:'center', justifyContent:'center' },
  bigAvT: { color:T.accent, fontSize:36, fontWeight:'900' },
  nm: { color:T.text, fontSize:22, fontWeight:'900' },
  hd: { color:T.muted, fontSize:14, marginTop:2 },
  bio: { color:T.text, fontSize:13, marginTop:10, textAlign:'center' },
  stats: { flexDirection:'row', marginTop:24, alignItems:'center' },
  stat: { alignItems:'center', paddingHorizontal:24 },
  num: { color:T.accent, fontSize:20, fontWeight:'800' },
  lbl: { color:T.muted, fontSize:12, marginTop:2 },
  divider: { width:1, height:24, backgroundColor:T.border },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', padding:24 },
  modal: { backgroundColor:T.surface, borderRadius:20, padding:24, borderWidth:1, borderColor:T.border },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  in: { backgroundColor:T.bg, color:T.text, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, marginBottom:12 },
  modalActions: { flexDirection:'row', gap:12, marginTop:8 },
  cancelBtn: { flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' },
  goBtn: { flex:1, padding:14, borderRadius:12, backgroundColor:T.accent, alignItems:'center' },
  goT: { color:'#000', fontWeight:'800' }
});
