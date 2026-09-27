import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

let Camera = null;
let useCameraPermissions = null;
try {
  const cam = require('expo-camera');
  Camera = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch (e) {
  // Camera not installed in dev — fall back to simulation
}

export default function WatchScreen() {
  const { state, goLive, endLive, bumpLiveViewers } = useApp();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [myLive, setMyLive] = useState(null);
  const [viewers, setViewers] = useState(0);
  const [perm, requestPerm] = useCameraPermissions ? useCameraPermissions() : [null, () => {}];
  const timerRef = useRef(null);

  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const start = async () => {
    if (!title.trim()) return Alert.alert('Title required');
    if (useCameraPermissions && !perm?.granted) {
      const r = await requestPerm();
      if (!r.granted) return Alert.alert('Camera permission needed for live');
    }
    goLive(title);
    const live = state.watch.find(w => w.userId === (user?.id || 'me') && w.live);
    setMyLive({ id: 'w' + Date.now(), title });
    setTitle('');
    setModal(false);
    setViewers(0);

    // Simulate live viewer growth
    timerRef.current = setInterval(() => {
      setViewers(v => v + Math.floor(Math.random() * 3) + 1);
    }, 2000);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (myLive) endLive(myLive.id);
    setMyLive(null);
    setViewers(0);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ACTIVE BROADCAST MODE
  if (myLive) {
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        <View style={S.liveHeader}>
          <View style={S.livePill}><View style={S.liveDot} /><Text style={S.livePillT}>LIVE</Text></View>
          <View style={S.liveViewers}>
            <Ionicons name="eye" size={14} color={T.text} />
            <Text style={S.liveViewersT}>{viewers}</Text>
          </View>
        </View>

        <View style={S.livePreview}>
          {Camera && perm?.granted ? (
            <Camera style={StyleSheet.absoluteFill} facing="front" />
          ) : (
            <View style={S.liveFallback}>
              <Ionicons name="videocam" size={64} color={T.accent} />
              <Text style={S.liveFallbackT}>Broadcasting…</Text>
            </View>
          )}
          <View style={S.liveOverlay}>
            <View style={S.liveTitleWrap}>
              <Text style={S.liveTitle}>{myLive.title}</Text>
              <Text style={S.liveSub}>{user?.name} · {user?.handle}</Text>
            </View>
          </View>
        </View>

        <View style={S.liveControls}>
          <TouchableOpacity style={S.liveCtrl}>
            <Ionicons name="mic-outline" size={22} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={S.liveCtrl}>
            <Ionicons name="camera-reverse-outline" size={22} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={S.liveCtrl}>
            <Ionicons name="chatbubbles-outline" size={22} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={S.endBtn} onPress={stop}>
            <Ionicons name="close" size={22} color="#FFF" />
            <Text style={S.endT}>End</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // WATCH MODE
  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Watch</Text>
        <TouchableOpacity style={S.goLiveBtn} onPress={() => setModal(true)}>
          <View style={S.goLiveDot} />
          <Text style={S.goLiveT}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.watch}
        keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const u = usersById[item.userId] || { name: 'You' };
          return (
            <View style={S.card}>
              <View style={S.thumb}>
                <Ionicons name="videocam" size={48} color={item.live ? T.danger : T.accent} />
                {item.live && (
                  <View style={S.liveBadge}><View style={S.liveBadgeDot} /><Text style={S.liveBadgeT}>LIVE</Text></View>
                )}
                <View style={S.thumbViews}>
                  <Ionicons name="eye" size={12} color="#FFF" />
                  <Text style={S.thumbViewsT}>{item.views.toLocaleString()}</Text>
                </View>
              </View>
              <View style={S.cardMeta}>
                <View style={S.metaAv}><Text style={S.metaAvT}>{u.name[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={S.nm}>{item.title}</Text>
                  <Text style={S.hd}>{u.name}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modal} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <View style={S.modalHead}>
              <Text style={S.modalTitle}>Go Live</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>
            <Text style={S.modalSub}>Broadcast to your followers</Text>
            <TextInput style={S.in} placeholder="Stream title" placeholderTextColor={T.muted} value={title} onChangeText={setTitle} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setModal(false)}>
                <Text style={S.cancelT}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.go} onPress={start}>
                <Ionicons name="radio" size={16} color="#000" />
                <Text style={S.goT}>Start Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },

  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  title: { color: T.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' },
  goLiveT: { color: '#000', fontWeight: '800', fontSize: 13 },

  card: { marginBottom: 12, backgroundColor: T.bg, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: T.divider },
  thumb: { height: 220, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  liveBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: T.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeT: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  thumbViews: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  thumbViewsT: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  metaAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  metaAvT: { color: T.accent, fontWeight: '900', fontSize: 15 },
  nm: { color: T.text, fontSize: 15, fontWeight: '700' },
  hd: { color: T.muted, fontSize: 12.5, marginTop: 2 },

  // Live broadcast mode
  liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  livePillT: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  liveViewers: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  liveViewersT: { color: T.text, fontWeight: '800', fontSize: 13 },
  livePreview: { flex: 1, backgroundColor: T.elevated, position: 'relative', overflow: 'hidden' },
  liveFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  liveFallbackT: { color: T.accent, fontSize: 16, fontWeight: '700' },
  liveOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  liveTitleWrap: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 12, borderRadius: 12 },
  liveTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  liveSub: { color: '#B0B0B0', fontSize: 12, marginTop: 2 },
  liveControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 12 },
  liveCtrl: { width: 52, height: 52, borderRadius: 26, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.danger, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30 },
  endT: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: T.divider },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  modalSub: { color: T.muted, fontSize: 13, marginBottom: 18 },
  in: { backgroundColor: T.surface, color: T.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 20, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  cancelT: { color: T.text, fontWeight: '700' },
  go: { flex: 1, flexDirection: 'row', gap: 6, padding: 14, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  goT: { color: '#000', fontWeight: '800' }
});
