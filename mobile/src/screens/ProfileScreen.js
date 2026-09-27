import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, signOut, updateProfile } = useAuth();
  const { state } = useApp();
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('posts');
  const [form, setForm] = useState({
    name: user?.name || '',
    handle: user?.handle || '',
    bio: user?.bio || ''
  });

  const me = state.users.find(u => u.id === (user?.id || 'me')) || user || {};
  const mine = state.posts.filter(p => p.userId === (user?.id || 'me'));
  const saved = state.posts.filter(p => state.bookmarks.includes(p.id));
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const save = () => {
    if (!form.name.trim()) return Alert.alert('Name required');
    updateProfile(form);
    setEdit(false);
  };

  const data = tab === 'posts' ? mine : saved;

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.topBar}>
        <Text style={S.topTitle}>{user?.name}</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <TouchableOpacity onPress={() => nav.push('Saved')}>
            <Ionicons name="bookmark-outline" size={22} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setForm({ name: user?.name || '', handle: user?.handle || '', bio: user?.bio || '' }); setEdit(true); }}>
            <Ionicons name="create-outline" size={22} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <View>
            {/* Cover + avatar */}
            <View style={S.cover}>
              <View style={S.coverGradient} />
              <View style={S.avatarWrap}>
                <View style={S.avatar}>
                  <Text style={S.avatarT}>{(user?.name || '?')[0].toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={S.info}>
              <Text style={S.name}>{user?.name}</Text>
              <Text style={S.handle}>{user?.handle}</Text>
              {user?.bio ? <Text style={S.bio}>{user.bio}</Text> : null}

              <View style={S.stats}>
                <View style={S.stat}><Text style={S.num}>{me.followers || 0}</Text><Text style={S.lbl}>Followers</Text></View>
                <View style={S.div} />
                <View style={S.stat}><Text style={S.num}>{state.follows.following.length}</Text><Text style={S.lbl}>Following</Text></View>
                <View style={S.div} />
                <View style={S.stat}><Text style={S.num}>{mine.length}</Text><Text style={S.lbl}>Posts</Text></View>
              </View>

              <TouchableOpacity style={S.editBtn} onPress={() => { setForm({ name: user?.name || '', handle: user?.handle || '', bio: user?.bio || '' }); setEdit(true); }}>
                <Ionicons name="create-outline" size={16} color="#000" />
                <Text style={S.editBtnT}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <View style={S.tabs}>
              <TouchableOpacity style={[S.tab, tab === 'posts' && S.tabActive]} onPress={() => setTab('posts')}>
                <Ionicons name="grid-outline" size={16} color={tab === 'posts' ? T.accent : T.muted} />
                <Text style={[S.tabT, tab === 'posts' && S.tabTActive]}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.tab, tab === 'saved' && S.tabActive]} onPress={() => setTab('saved')}>
                <Ionicons name="bookmark-outline" size={16} color={tab === 'saved' ? T.accent : T.muted} />
                <Text style={[S.tabT, tab === 'saved' && S.tabTActive]}>Saved</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId] || user} />}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name={tab === 'saved' ? 'bookmark-outline' : 'cube-outline'} size={40} color={T.muted} />
            <Text style={S.emptyT}>{tab === 'saved' ? 'No saved posts' : 'No posts yet'}</Text>
          </View>
        }
      />

      <Modal visible={edit} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <View style={S.modalHead}>
              <Text style={S.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEdit(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>
            <TextInput style={S.in} placeholder="Name" placeholderTextColor={T.muted} value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            <TextInput style={S.in} placeholder="Handle" placeholderTextColor={T.muted} value={form.handle} onChangeText={t => setForm({ ...form, handle: t })} />
            <TextInput style={[S.in, { height: 80 }]} placeholder="Bio" placeholderTextColor={T.muted} multiline value={form.bio} onChangeText={t => setForm({ ...form, bio: t })} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setEdit(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={S.go} onPress={save}><Text style={S.goT}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  topTitle: { color: T.text, fontSize: 18, fontWeight: '800' },

  cover: { height: 160, backgroundColor: '#0A1A18', position: 'relative' },
  coverGradient: { position: 'absolute', inset: 0, backgroundColor: T.accentDim },
  avatarWrap: { position: 'absolute', bottom: -50, left: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: T.bg, borderWidth: 4, borderColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  avatarT: { color: T.accent, fontSize: 40, fontWeight: '900' },

  info: { paddingTop: 60, paddingHorizontal: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.divider, paddingBottom: 16 },
  name: { color: T.text, fontSize: 22, fontWeight: '900' },
  handle: { color: T.muted, fontSize: 14, marginTop: 2 },
  bio: { color: T.subText, fontSize: 14, marginTop: 10, textAlign: 'center' },

  stats: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  stat: { alignItems: 'center', paddingHorizontal: 22 },
  num: { color: T.accent, fontSize: 20, fontWeight: '800' },
  lbl: { color: T.muted, fontSize: 11, marginTop: 2 },
  div: { width: 1, height: 22, backgroundColor: T.divider },

  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, backgroundColor: T.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22 },
  editBtnT: { color: '#000', fontWeight: '800', fontSize: 13 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.divider },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.accent },
  tabT: { color: T.muted, fontSize: 13, fontWeight: '600' },
  tabTActive: { color: T.text },

  empty: { padding: 60, alignItems: 'center', gap: 8 },
  emptyT: { color: T.muted, fontSize: 13 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: T.divider },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '800' },
  in: { backgroundColor: T.surface, color: T.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  cancelT: { color: T.text, fontWeight: '700' },
  go: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center' },
  goT: { color: '#000', fontWeight: '800' }
});
