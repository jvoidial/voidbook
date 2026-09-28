import React, { useState, useRef } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet, Image, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WatchScreen() {
  const { state, goLive, endLive } = useApp();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const start = () => {
    if (!title.trim()) return Alert.alert('Title required');
    goLive(title); setTitle(''); setModal(false);
  };

  const renderItem = ({ item }) => {
    const u = usersById[item.userId] || { name: 'You', handle: '@you' };
    return (
      <View style={S.videoContainer}>
        {/* Video Placeholder */}
        <View style={S.videoBg}>
          <Ionicons name="videocam" size={64} color={T.accent} opacity={0.5} />
        </View>

        {/* Right-side Action Bar (TikTok style) */}
        <View style={S.rightBar}>
          <TouchableOpacity style={S.actionBtn}>
            <View style={S.avatarSmall}><Text style={S.avatarSmallT}>{u.name[0]}</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={S.actionBtn}>
            <Ionicons name="heart" size={36} color="#FFF" />
            <Text style={S.actionT}>{item.views > 1000 ? `${(item.views/1000).toFixed(1)}K` : item.views}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.actionBtn}>
            <Ionicons name="chatbubble-ellipses" size={34} color="#FFF" />
            <Text style={S.actionT}>124</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.actionBtn}>
            <Ionicons name="arrow-redo" size={34} color="#FFF" />
            <Text style={S.actionT}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Overlay */}
        <View style={S.bottomOverlay}>
          <Text style={S.videoTitle}>{item.title}</Text>
          <Text style={S.videoUser}>@{u.handle?.replace('@','')}</Text>
          <View style={S.musicRow}>
            <Ionicons name="musical-notes" size={14} color="#FFF" />
            <Text style={S.musicText}>Original Sound — {u.name}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      {/* Floating Go Live Button */}
      <View style={S.topBar}>
        <Text style={S.topTitle}>Watch</Text>
        <TouchableOpacity style={S.goLiveBtn} onPress={() => setModal(true)}>
          <View style={S.goLiveDot} />
          <Text style={S.goLiveT}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.watch}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT - 120} // Account for header + tab bar
        snapToAlignment="start"
        decelerationRate="fast"
      />

      {/* Go Live Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Start Live Stream</Text>
            <TextInput style={S.in} placeholder="Stream title" placeholderTextColor={T.muted} value={title} onChangeText={setTitle} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setModal(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={S.go} onPress={start}><Text style={S.goT}>Go Live</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  topTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' },
  goLiveT: { color: '#000', fontWeight: '800', fontSize: 12 },
  
  videoContainer: { height: SCREEN_HEIGHT - 120, width: '100%', position: 'relative', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  
  rightBar: { position: 'absolute', right: 12, bottom: 100, alignItems: 'center', gap: 20 },
  actionBtn: { alignItems: 'center' },
  avatarSmall: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#FFF', backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  avatarSmallT: { color: T.accent, fontWeight: '900', fontSize: 20 },
  actionT: { color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 4 },
  
  bottomOverlay: { position: 'absolute', left: 16, right: 80, bottom: 100 },
  videoTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  videoUser: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  musicText: { color: '#FFF', fontSize: 12 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: T.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  in: { backgroundColor: T.bg, color: T.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  cancelT: { color: T.text, fontWeight: '700' },
  go: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center' },
  goT: { color: '#000', fontWeight: '800' }
});
