import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme as T } from '../theme';

export default function WatchScreen() {
  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Watch</Text></View>
      <View style={S.center}>
        <Ionicons name="videocam-off-outline" size={64} color={T.muted} />
        <Text style={{ color: T.text, fontSize: 18, fontWeight: 'bold', marginTop: 16 }}>Live is coming soon</Text>
        <Text style={{ color: T.muted, marginTop: 8 }}>We are upgrading our streaming servers.</Text>
      </View>
    </SafeAreaView>
  );
}
const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  top: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  title: { color: T.text, fontSize: 20, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
