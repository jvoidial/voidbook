import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme as T } from '../theme';

const MODES = [
  { key: 'video', icon: 'videocam', label: 'Video', blurb: 'Go live with your camera.' },
  { key: 'audio', icon: 'mic', label: 'Audio Space', blurb: 'Talk with the camera off.' }
];

export default function StartLiveScreen() {
  const nav = useNavigation();
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState('video');

  const go = () => {
    if (!title.trim()) {
      Alert.alert('Stream title', 'Give your stream a title first.');
      return;
    }
    // The token is fetched inside LiveRoomScreen so the join flow owns its own
    // loading and error states.
    nav.navigate('LiveRoom', { title: title.trim(), mode });
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={S.topTitle}>Go live</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={S.body}>
          <Text style={S.label}>Stream title</Text>
          <TextInput
            style={S.input}
            placeholder="What are you broadcasting?"
            placeholderTextColor={T.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />

          <Text style={[S.label, { marginTop: 24 }]}>Mode</Text>
          {MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[S.mode, mode === m.key && S.modeOn]}
              onPress={() => setMode(m.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={m.icon} size={22} color={mode === m.key ? T.text : T.subText} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[S.modeT, mode === m.key && S.modeTOn]}>{m.label}</Text>
                <Text style={S.modeB}>{m.blurb}</Text>
              </View>
              <Ionicons
                name={mode === m.key ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={mode === m.key ? T.link : T.muted}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[S.cta, !title.trim() && { opacity: 0.5 }]} disabled={!title.trim()} onPress={go}>
          <Ionicons name="radio" size={18} color={T.bg} />
          <Text style={S.ctaT}>Start {mode === 'video' ? 'video' : 'audio'} stream</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  topTitle: { color: T.text, fontSize: 17, fontWeight: '800' },
  body: { padding: 20, flex: 1 },
  label: { color: T.subText, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, color: T.text, fontSize: 16, backgroundColor: T.surface },
  mode: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: T.border, borderRadius: 16, padding: 16, marginBottom: 12 },
  modeOn: { borderColor: T.text },
  modeT: { color: T.subText, fontSize: 16, fontWeight: '800' },
  modeTOn: { color: T.text },
  modeB: { color: T.muted, fontSize: 13, marginTop: 2 },
  cta: { flexDirection: 'row', gap: 8, backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30, alignItems: 'center', justifyContent: 'center', margin: 20 },
  ctaT: { color: T.bg, fontWeight: '800', fontSize: 16 }
});
