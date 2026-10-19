import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function FeedScreen() {
  const nav = useNavigation();
  const { state, addPost } = useApp();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [text, setText] = useState('');
  const usersById = Object.fromEntries((state.users || []).map(u => [u.id, u]));

  const submit = () => {
    if (!text.trim()) return;
    addPost(text);
    setText('');
    setModal(false);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      {/* X-Style Header */}
      <View style={S.topBar}>
        <TouchableOpacity onPress={() => nav.navigate('Profile')}>
          <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0].toUpperCase()}</Text></View>
        </TouchableOpacity>
        
        <Ionicons name="logo-twitter" size={28} color={T.text} />
        
        <TouchableOpacity onPress={() => nav.navigate('Settings')}>
          <Ionicons name="sparkles" size={24} color={T.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.posts}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
      />

      {/* Floating Action Button (Compose) */}
      <TouchableOpacity style={S.fab} onPress={() => setModal(true)}>
        <Ionicons name="pencil" size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Compose Modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[S.c, { backgroundColor: T.bg }]}>
          <View style={S.modalHeader}>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={{ color: T.text, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.postBtn, !text.trim() && { opacity: 0.5 }]} disabled={!text.trim()} onPress={submit}>
              <Text style={S.postBtnT}>Post</Text>
            </TouchableOpacity>
          </View>
          <View style={S.modalBody}>
            <View style={S.av}><Text style={S.avT}>{(user?.name || '?')[0].toUpperCase()}</Text></View>
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
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  av: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  avT: { color: T.text, fontWeight: 'bold', fontSize: 14 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  postBtn: { backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  postBtnT: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  modalBody: { flexDirection: 'row', padding: 16, flex: 1 },
  modalInput: { flex: 1, color: T.text, fontSize: 18, marginLeft: 12, textAlignVertical: 'top' }
});
