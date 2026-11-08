import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme as T } from '../../theme';

export default function SignInScreen({ navigation }) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await signIn({ email, password }); }
    catch (e) { Alert.alert('Sign in failed', e.message); }
    finally { setBusy(false); }
  };

  const sendReset = async (address) => {
    const target = (address || '').trim();
    if (!target) return Alert.alert('Email required', 'Enter the email on your account.');
    setSending(true);
    try {
      await resetPassword(target);
      setForgot(false);
      Alert.alert('Check your inbox', `If ${target} has an account, a reset link is on its way.`);
    } catch (e) {
      Alert.alert('Could not send reset link', e.message);
    } finally {
      setSending(false);
    }
  };

  // Alert.prompt is iOS-only, so Android gets an in-app modal instead.
  const startForgot = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt('Reset password', 'Enter the email on your account.', async (value) => {
        await sendReset(value);
      }, 'plain-text', email);
    } else {
      setResetEmail(email);
      setForgot(true);
    }
  };

  return (
    <SafeAreaView style={S.c}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.back}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>

        <View style={S.head}>
          <Text style={S.title}>Welcome back</Text>
          <Text style={S.sub}>Sign in to your sqawk account.</Text>
        </View>

        <View style={S.form}>
          <View style={S.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={T.muted} style={S.icon} />
            <TextInput style={S.input} placeholder="Email" placeholderTextColor={T.muted}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              value={email} onChangeText={setEmail} />
          </View>

          <View style={S.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={T.muted} style={S.icon} />
            <TextInput style={S.input} placeholder="Password" placeholderTextColor={T.muted}
              secureTextEntry={!show} value={password} onChangeText={setPassword} />
            <TouchableOpacity onPress={() => setShow(s => !s)} style={S.icon}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={T.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={startForgot} style={S.forgot}>
            <Text style={S.forgotT}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[S.primary, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}>
            <Text style={S.primaryT}>{busy ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={S.link}>
            <Text style={S.linkT}>New here? <Text style={{ color: T.link }}>Create account</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={forgot} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Reset password</Text>
            <Text style={S.modalSub}>We will email you a link to set a new password.</Text>
            <View style={S.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={T.muted} style={S.icon} />
              <TextInput style={S.input} placeholder="Email" placeholderTextColor={T.muted}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                value={resetEmail} onChangeText={setResetEmail} />
            </View>
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setForgot(false)}>
                <Text style={S.cancelT}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.go} disabled={sending} onPress={() => sendReset(resetEmail)}>
                <Text style={S.goT}>{sending ? 'Sending…' : 'Send link'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg, padding: 24 },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  head: { marginTop: 24, marginBottom: 32 },
  title: { color: T.text, fontSize: 32, fontWeight: '900' },
  sub: { color: T.muted, marginTop: 6 },
  form: { gap: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface,
               borderRadius: 16, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, height: 54 },
  icon: { marginRight: 8 },
  input: { flex: 1, color: T.text, fontSize: 15, paddingVertical: 0 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotT: { color: T.link, fontSize: 13, fontWeight: '600' },
  primary: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30,
             alignItems: 'center', marginTop: 8 },
  primaryT: { color: '#000', fontWeight: '800', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 16 },
  linkT: { color: T.muted, fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: T.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 20, fontWeight: '800' },
  modalSub: { color: T.muted, fontSize: 13, marginTop: 6, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  cancelT: { color: T.text, fontWeight: '700' },
  go: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: T.accent, alignItems: 'center' },
  goT: { color: '#000', fontWeight: '800' }
});
