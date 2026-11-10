import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Daily, { DailyMediaView } from '@daily-co/react-native-daily-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

const initial = (name) => (name || '?').trim()[0]?.toUpperCase() || '?';

export default function LiveRoomScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { user, profile } = useAuth();
  const { title = 'Live', mode = 'video', room } = route.params || {};

  const callRef = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting | joined | error
  const [error, setError] = useState(null);
  const [parts, setParts] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === 'video');

  const syncParticipants = useCallback(() => {
    const call = callRef.current;
    if (call) setParts({ ...call.participants() });
  }, []);

  const hangUp = useCallback(async () => {
    const call = callRef.current;
    callRef.current = null;
    if (call) {
      try { await call.leave(); } catch { /* already left */ }
      try { call.destroy(); } catch { /* already destroyed */ }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const call = Daily.createCallObject({ audioSource: true, videoSource: mode === 'video' });
    callRef.current = call;

    call.on('joined-meeting', () => { if (alive) { setStatus('joined'); syncParticipants(); } });
    call.on('participant-joined', syncParticipants);
    call.on('participant-updated', syncParticipants);
    call.on('participant-left', syncParticipants);
    call.on('left-meeting', () => { if (alive) nav.goBack(); });
    call.on('error', (e) => {
      if (alive) { setStatus('error'); setError(e?.errorMsg || 'Live session error'); }
    });

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('daily-token', {
          body: { title, mode, room }
        });
        if (fnError) throw fnError;
        if (!data?.url || !data?.token) throw new Error(data?.detail || 'No room token returned');
        await call.join({ url: data.url, token: data.token });
      } catch (e) {
        if (alive) {
          setStatus('error');
          setError(e?.message || 'Could not start the live session.');
        }
      }
    })();

    return () => {
      alive = false;
      hangUp();
    };
  }, [title, mode, room, nav, syncParticipants, hangUp]);

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    callRef.current?.setLocalAudio(next);
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    callRef.current?.setLocalVideo(next);
  };

  const leave = async () => { await hangUp(); nav.goBack(); };

  const others = Object.values(parts).filter(p => !p.local);
  const local = parts.local;
  const localVideo = local?.tracks?.video?.persistentTrack || null;
  const localAudio = local?.tracks?.audio?.persistentTrack || null;

  if (status === 'connecting') {
    return (
      <SafeAreaView style={[S.c, S.center]}>
        <ActivityIndicator color={T.text} size="large" />
        <Text style={S.connT}>Going live…</Text>
        <Text style={S.connSub}>{title}</Text>
        <TouchableOpacity style={S.cancel} onPress={leave}>
          <Text style={S.cancelT}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[S.c, S.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
        <Text style={S.connT}>Could not go live</Text>
        <Text style={S.connSub}>{error}</Text>
        <TouchableOpacity style={S.cancel} onPress={leave}>
          <Text style={S.cancelT}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={S.c}>
      {/* Stage */}
      <View style={S.stage}>
        {mode === 'video' ? (
          localVideo ? (
            <DailyMediaView
              videoTrack={localVideo}
              audioTrack={localAudio}
              mirror
              objectFit="cover"
              zOrder={0}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={S.placeholder}>
              <Ionicons name="videocam-off-outline" size={56} color={T.muted} />
              <Text style={S.phT}>Camera off</Text>
            </View>
          )
        ) : (
          <View style={S.placeholder}>
            <View style={S.micCircle}>
              <Ionicons name="mic" size={56} color={T.text} />
            </View>
            <Text style={S.phT}>{profile?.name || 'You'}</Text>
            <Text style={S.phSub}>Audio space · {others.length + 1} listening</Text>
          </View>
        )}

        {/* Top overlay */}
        <SafeAreaView edges={['top']} style={S.overlayTop} pointerEvents="box-none">
          <View style={S.liveBadge}>
            <View style={S.liveDot} />
            <Text style={S.liveT}>LIVE</Text>
          </View>
          <Text style={S.streamTitle} numberOfLines={1}>{title}</Text>
        </SafeAreaView>
      </View>

      {/* Remote participants (video mode) */}
      {mode === 'video' && others.length > 0 && (
        <View style={S.strips}>
          {others.map(p => (
            <View key={p.session_id} style={S.strip}>
              {p.tracks?.video?.persistentTrack ? (
                <DailyMediaView
                  videoTrack={p.tracks.video.persistentTrack}
                  audioTrack={p.tracks.audio.persistentTrack}
                  objectFit="cover"
                  zOrder={0}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, S.stripFallback]}>
                  <Text style={S.stripT}>{initial(p.user_name)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Controls */}
      <SafeAreaView edges={['bottom']} style={S.controls}>
        <TouchableOpacity style={[S.ctrl, !micOn && S.ctrlOff]} onPress={toggleMic}>
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={24} color={T.text} />
        </TouchableOpacity>

        {mode === 'video' && (
          <TouchableOpacity style={[S.ctrl, !camOn && S.ctrlOff]} onPress={toggleCam}>
            <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={24} color={T.text} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[S.ctrl, S.ctrlEnd]} onPress={leave}>
          <Ionicons name="call" size={24} color={T.text} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  connT: { color: T.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  connSub: { color: T.subText, fontSize: 14, textAlign: 'center' },
  cancel: { marginTop: 20, borderWidth: 1, borderColor: T.border, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12 },
  cancelT: { color: T.text, fontWeight: '700' },

  stage: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 12 },
  micCircle: { width: 128, height: 128, borderRadius: 64, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  phT: { color: T.text, fontSize: 20, fontWeight: '900' },
  phSub: { color: T.subText, fontSize: 14 },

  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.danger, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.text },
  liveT: { color: T.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  streamTitle: { color: T.text, fontSize: 15, fontWeight: '800', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },

  strips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, backgroundColor: '#000' },
  strip: { width: 96, height: 128, borderRadius: 12, overflow: 'hidden', backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  stripFallback: { alignItems: 'center', justifyContent: 'center' },
  stripT: { color: T.text, fontSize: 28, fontWeight: '900' },

  controls: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 18, backgroundColor: '#000', borderTopWidth: 1, borderTopColor: T.divider },
  ctrl: { width: 60, height: 60, borderRadius: 30, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
  ctrlOff: { backgroundColor: T.bg },
  ctrlEnd: { backgroundColor: T.danger, borderColor: T.danger, transform: [{ rotate: '135deg' }] }
});
