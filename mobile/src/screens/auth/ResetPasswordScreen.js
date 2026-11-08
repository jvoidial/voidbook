import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme as T } from '../../theme';

// Shown when the app is opened from a password-recovery link. The user is
// already holding a valid session, so this only has to set the new password.
export default function ResetPasswordScreen() {
  const { changePassword, signOut, clearRecovery } = useAuth();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (pw1.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');
    if (pw1 !== pw2) return Alert.alert('Passwords do not match', 'Please re-enter your new password.');
    setBusy(true);
    try {
      await changePassword(pw1);
      clearRecovery();
      Alert.alert('Password updated', 'You are signed in with your new password.');
    } catch (e) {
      Alert.alert('Could not update password', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={S.c}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={S.head}>
          <Text style={S.title}>New password</Text>
          <Text style={S.sub}>Choose a new password for your sqawk account.</Text>
        </View>

        <View style={S.form}>
          <View style={S.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={T.muted} style={S.icon} />
            <TextInput style={S.input} placeholder="New password" placeholderTextColor={T.muted}
              secureTextEntry value={pw1} onChangeText={setPw1} />
          </View>
          <View style={S.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={T.muted} style={S.icon} />
            <TextInput style={S.input} placeholder="Confirm new password" placeholderTextColor={T.muted}
              secureTextEntry value={pw2} onChangeText={setPw2} />
          </View>
          {pw2.length > 0 && pw1 !== pw2 && <Text style={S.warn}>Passwords do not match</Text>}

          <TouchableOpacity style={[S.primary, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}>
            <Text style={S.primaryT}>{busy ? 'Saving…' : 'Update password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { clearRecovery(); signOut(); }} style={S.link}>
            <Text style={S.linkT}>Cancel and sign out</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg, padding: 24 },
  head: { marginTop: 48, marginBottom: 32 },
  title: { color: T.text, fontSize: 32, fontWeight: '900' },
  sub: { color: T.muted, marginTop: 6 },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface,
               borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, height: 54 },
  icon: { marginRight: 8 },
  input: { flex: 1, color: T.text, fontSize: 15, paddingVertical: 0 },
  warn: { color: T.danger, fontSize: 12, marginTop: -6 },
  primary: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30,
             alignItems: 'center', marginTop: 8 },
  primaryT: { color: '#000', fontWeight: '800', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 16 },
  linkT: { color: T.muted, fontSize: 14 }
});
