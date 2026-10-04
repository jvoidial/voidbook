import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getLiveKitToken, roomNameForUser } from '../lib/livekit';
import { theme as T } from '../theme';

function BroadcastRoom({ roomName, onEnd, title }) {
  const [creds, setCreds] = useState(null);
  const { user } = useAuth();
  const { goLive } = useApp();

  useEffect(() => {
    (async () => {
      try {
        await AudioSession.startAudioSession();
        const { serverUrl, token } = await getLiveKitToken(roomName, user?.name || 'Broadcaster');
        setCreds({ serverUrl, token });
        goLive(title || 'Live on VOIDBOOK');
      } catch (e) {
        Alert.alert('LiveKit error', e.message);
        onEnd();
      }
    })();
    return () => { AudioSession.stopAudioSession(); };
  }, []);

  if (!creds) return <View style={S.center}><ActivityIndicator color={T.accent} size="large" /></View>;

  return (
    <LiveKitRoom serverUrl={creds.serverUrl} token={creds.token} connect audio video onDisconnected={onEnd}>
      <BroadcastInner title={title} onEnd={onEnd} />
    </LiveKitRoom>
  );
}

function BroadcastInner({ title, onEnd }) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant } = useLocalParticipant();
  const me = tracks.find(t => isTrackReference(t) && t.participant?.identity === localParticipant?.identity);

  return (
    <View style={S.liveWrap}>
      {me && isTrackReference(me) ? (
        <VideoTrack trackRef={me} style={StyleSheet.absoluteFill} mirror />
      ) : (
        <View style={S.center}><ActivityIndicator color={T.accent} /></View>
      )}
      <View style={S.liveHeader}>
        <View style={S.livePill}><View style={S.liveDot} /><Text style={S.livePillT}>LIVE</Text></View>
      </View>
      <View style={S.liveBottom}>
        <Text style={S.liveTitle} numberOfLines={1}>{title}</Text>
        <TouchableOpacity style={S.endBtn} onPress={onEnd}>
          <Ionicons name="close" size={22} color="#FFF" />
          <Text style={S.endT}>End Stream</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ViewerRoom({ roomName, onClose, title, hostName }) {
  const [creds, setCreds] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        await AudioSession.startAudioSession();
        const { serverUrl, token } = await getLiveKitToken(roomName, user?.name || 'Viewer');
        setCreds({ serverUrl, token });
      } catch (e) {
        Alert.alert('Cannot join', e.message);
        onClose();
      }
    })();
    return () => { AudioSession.stopAudioSession(); };
  }, []);

  if (!creds) return <View style={S.center}><ActivityIndicator color={T.accent} size="large" /></View>;

  return (
    <LiveKitRoom serverUrl={creds.serverUrl} token={creds.token} connect audio video onDisconnected={onClose}>
      <ViewerView title={title} hostName={hostName} onClose={onClose} />
    </LiveKitRoom>
  );
}

function ViewerView({ title, hostName, onClose }) {
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant } = useLocalParticipant();
  const remote = tracks.find(t => isTrackReference(t) && t.participant?.identity !== localParticipant?.identity);

  return (
    <View style={S.liveWrap}>
      {remote && isTrackReference(remote) ? (
        <VideoTrack trackRef={remote} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={S.center}>
          <Ionicons name="videocam-outline" size={64} color={T.muted} />
          <Text style={{ color: T.muted, marginTop: 8 }}>Connecting…</Text>
        </View>
      )}
      <View style={S.liveHeader}>
        <TouchableOpacity onPress={onClose} style={S.closeBtn}>
          <Ionicons name="close" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={S.livePill}><View style={S.liveDot} /><Text style={S.livePillT}>LIVE</Text></View>
        <View style={{ width: 40 }} />
      </View>
      <View style={S.liveBottom}>
        <Text style={S.liveTitle} numberOfLines={1}>{title}</Text>
        <Text style={S.liveHost}>@{hostName}</Text>
      </View>
    </View>
  );
}

export default function WatchScreen() {
  const { state, endLive } = useApp();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [viewing, setViewing] = useState(null);
  const usersById = Object.fromEntries((state.users || []).map(u => [u.id, u]));

  const start = () => {
    if (!title.trim()) return Alert.alert('Title required');
    setModal(false);
    setBroadcasting(true);
  };

  if (broadcasting) {
    return <BroadcastRoom
      roomName={roomNameForUser(user?.id)}
      title={title}
      onEnd={() => { setBroadcasting(false); endLive(roomNameForUser(user?.id)); setTitle(''); }}
    />;
  }

  if (viewing) {
    return <ViewerRoom
      roomName={roomNameForUser(viewing.userId)}
      title={viewing.title}
      hostName={usersById[viewing.userId]?.handle?.replace('@','') || 'host'}
      onClose={() => setViewing(null)}
    />;
  }

  const liveStreams = (state.watch || []).filter(w => w.live);

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
        data={liveStreams}
        keyExtractor={i => i.id}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="videocam-off-outline" size={48} color={T.muted} />
            <Text style={S.emptyT}>No one is live right now</Text>
            <Text style={S.emptySub}>Be the first — tap Go Live</Text>
          </View>
        }
        renderItem={({ item }) => {
          const u = usersById[item.userId] || { name: 'Live', handle: '@live' };
          return (
            <TouchableOpacity style={S.card} onPress={() => setViewing(item)}>
              <View style={S.thumb}>
                <Ionicons name="videocam" size={48} color={T.danger} />
                <View style={S.liveBadge}><View style={S.liveBadgeDot} /><Text style={S.liveBadgeT}>LIVE</Text></View>
              </View>
              <View style={S.cardMeta}>
                <View style={S.metaAv}><Text style={S.metaAvT}>{(u.name || '?')[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={S.nm}>{item.title}</Text>
                  <Text style={S.hd}>{u.name} · Tap to join</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={T.muted} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={modal} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Start Live Stream</Text>
            <Text style={S.modalSub}>Broadcast to VOIDBOOK in real time</Text>
            <TextInput style={S.in} placeholder="Stream title" placeholderTextColor={T.muted} value={title} onChangeText={setTitle} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setModal(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={S.go} onPress={start}>
                <Ionicons name="radio" size={16} color="#000" />
                <Text style={S.goT}>Go Live</Text>
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
  title: { color: T.text, fontSize: 22, fontWeight: '900' },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#000' },
  goLiveT: { color: '#000', fontWeight: '800', fontSize: 13 },
  card: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: T.divider, paddingBottom: 12 },
  thumb: { height: 200, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  liveBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: T.danger, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeT: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  metaAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  metaAvT: { color: T.accent, fontWeight: '900', fontSize: 15 },
  nm: { color: T.text, fontSize: 15, fontWeight: '700' },
  hd: { color: T.muted, fontSize: 12.5, marginTop: 2 },
  empty: { padding: 60, alignItems: 'center', gap: 8 },
  emptyT: { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: T.muted, fontSize: 13 },
  liveWrap: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  liveHeader: { position: 'absolute', top: 50, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  livePillT: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  liveBottom: { position: 'absolute', bottom: 40, left: 20, right: 20, zIndex: 10 },
  liveTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  liveHost: { color: '#D0D0D0', fontSize: 14, marginBottom: 16 },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.danger, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 30, alignSelf: 'center' },
  endT: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modal: { backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: T.divider },
  modalTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  modalSub: { color: T.muted, fontSize: 13, marginBottom: 18, marginTop: 4 },
  in: { backgroundColor: T.surface, color: T.text, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 20, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  cancelT: { color: T.text, fontWeight: '700' },
  go: { flex: 1, flexDirection: 'row', gap: 6, padding: 14, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  goT: { color: '#000', fontWeight: '800' }
});
