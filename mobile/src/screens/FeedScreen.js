import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { pickImage, uploadMedia } from '../lib/media';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function FeedScreen() {
  const nav = useNavigation();
  const { state, ready, addPost } = useApp();
  // `user` is the Supabase auth user (id/email only); display fields live on
  // the profile row, so read the name/avatar from there.
  const { user, profile } = useAuth();
  const displayName = profile?.name || user?.email?.split('@')[0] || 'You';
  const avatarUrl = profile?.avatar_url;
  const [modal, setModal] = useState(false);
  const [text, setText] = useState('');
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const usersById = Object.fromEntries((state.users || []).map(u => [u.id, u]));

  const closeModal = () => { setModal(false); setText(''); setAsset(null); };

  const attach = async () => {
    try {
      const picked = await pickImage({ allowsEditing: false, quality: 0.8 });
      if (picked) setAsset(picked);
    } catch (e) { Alert.alert('Photo', e.message); }
  };

  const submit = async () => {
    if (!text.trim() && !asset) return;
    try {
      setBusy(true);
      let mediaUrl = null;
      if (asset) mediaUrl = await uploadMedia(asset, 'post', user.id);
      await addPost(text.trim(), mediaUrl, mediaUrl ? 'image' : null);
      closeModal();
    } catch (e) { Alert.alert('Post failed', e.message); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      {/* X-Style Header */}
      <View style={S.topBar}>
        <TouchableOpacity onPress={() => nav.navigate('Profile')}>
          <View style={S.av}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={S.avImg} />
              : <Text style={S.avT}>{displayName[0].toUpperCase()}</Text>}
          </View>
        </TouchableOpacity>

        <Ionicons name="logo-twitter" size={28} color={T.text} />

        <TouchableOpacity onPress={() => nav.navigate('Settings')}>
          <Ionicons name="sparkles" size={24} color={T.text} />
        </TouchableOpacity>
      </View>

      {!ready ? (
        <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
      ) : state.loadError ? (
        <View style={S.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={T.muted} />
          <Text style={S.emptyT}>Could not load your feed</Text>
          <Text style={S.emptySub}>{state.loadError}</Text>
        </View>
      ) : (
        <FlatList
          data={state.posts}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="chatbubbles-outline" size={40} color={T.muted} />
              <Text style={S.emptyT}>No posts yet</Text>
              <Text style={S.emptySub}>Tap the pencil to say something.</Text>
            </View>
          }
          // Leave room under the last row so the FAB never covers it.
          contentContainerStyle={{ paddingBottom: 96 }}
        />
      )}

      {/* Floating Action Button (Compose) */}
      <TouchableOpacity style={S.fab} onPress={() => setModal(true)}>
        <Ionicons name="pencil" size={24} color={T.bg} />
      </TouchableOpacity>

      {/* Compose Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[S.c, { backgroundColor: T.bg }]}>
          <View style={S.modalHeader}>
            <TouchableOpacity onPress={closeModal} disabled={busy}>
              <Text style={{ color: T.text, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.postBtn, ((!text.trim() && !asset) || busy) && { opacity: 0.5 }]} disabled={(!text.trim() && !asset) || busy} onPress={submit}>
              {busy ? <ActivityIndicator color={T.bg} size="small" /> : <Text style={S.postBtnT}>Post</Text>}
            </TouchableOpacity>
          </View>
          <View style={S.modalBody}>
            <View style={S.av}>
              {avatarUrl
                ? <Image source={{ uri: avatarUrl }} style={S.avImg} />
                : <Text style={S.avT}>{displayName[0].toUpperCase()}</Text>}
            </View>
            <TextInput
              style={S.modalInput}
              placeholder="What is happening?!"
              placeholderTextColor={T.muted}
              multiline
              autoFocus
              value={text}
              onChangeText={setText}
            />
          </View>

          {asset && (
            <View style={S.previewWrap}>
              <Image source={{ uri: asset.uri }} style={S.preview} resizeMode="cover" />
              <TouchableOpacity style={S.removeMedia} onPress={() => setAsset(null)}>
                <Ionicons name="close" size={16} color={T.text} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={S.mediaBtn} onPress={attach} disabled={busy}>
            <Ionicons name="image-outline" size={22} color={T.link} />
            <Text style={S.mediaBtnT}>Add photo</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  av: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avImg: { width: '100%', height: '100%' },
  avT: { color: T.text, fontWeight: 'bold', fontSize: 14 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  postBtn: { backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, minWidth: 64, alignItems: 'center' },
  postBtnT: { color: T.bg, fontWeight: '700', fontSize: 14 },
  modalBody: { flexDirection: 'row', padding: 16, flex: 1 },
  modalInput: { flex: 1, color: T.text, fontSize: 18, marginLeft: 12, textAlignVertical: 'top' },
  previewWrap: { marginHorizontal: 16, marginBottom: 12 },
  preview: { width: '100%', height: 180, borderRadius: 16, borderWidth: 1, borderColor: T.border },
  removeMedia: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: T.divider },
  mediaBtnT: { color: T.link, fontSize: 15, fontWeight: '600' },
  empty: { padding: 60, alignItems: 'center', gap: 8 },
  emptyT: { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: T.muted, fontSize: 13 }
});
