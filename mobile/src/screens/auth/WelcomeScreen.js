import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme as T } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={S.c}>
      <View style={S.top}>
        <View style={S.logoBox}>
          <Ionicons name="cube" size={56} color={T.accent} />
        </View>
        <Text style={S.brand}>VOID<Text style={{ color: T.accent }}>BOOK</Text></Text>
        <Text style={S.tag}>The blackest social layer.</Text>
      </View>

      <View style={S.actions}>
        <TouchableOpacity style={S.primary} onPress={() => navigation.navigate('SignUp')}>
          <Text style={S.primaryT}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.secondary} onPress={() => navigation.navigate('SignIn')}>
          <Text style={S.secondaryT}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <Text style={S.footer}>By continuing you agree to the VOID Terms.</Text>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg, padding: 24, justifyContent: 'space-between' },
  top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoBox: { width: 112, height: 112, borderRadius: 32, borderWidth: 2, borderColor: T.accent,
             alignItems: 'center', justifyContent: 'center', marginBottom: 24,
             backgroundColor: T.surface },
  brand: { color: T.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  tag: { color: T.muted, marginTop: 8, fontSize: 14 },
  actions: { gap: 12, marginBottom: 24 },
  primary: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  primaryT: { color: '#000', fontWeight: '800', fontSize: 16 },
  secondary: { backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 30,
               alignItems: 'center', borderWidth: 1, borderColor: T.border },
  secondaryT: { color: T.text, fontWeight: '700', fontSize: 16 },
  footer: { color: T.muted, fontSize: 11, textAlign: 'center' }
});
