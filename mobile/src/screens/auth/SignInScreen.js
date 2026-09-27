import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme as T } from '../../theme';

export default function SignInScreen({ navigation }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await signIn({ email, password }); }
    catch (e) { Alert.alert('Sign in failed', e.message); }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={S.c}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.back}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>

        <View style={S.head}>
          <Text style={S.title}>Welcome back</Text>
          <Text style={S.sub}>Sign in to your VOID account.</Text>
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

          <TouchableOpacity style={[S.primary, busy && { opacity: 0.6 }]} disabled={busy} onPress={submit}>
            <Text style={S.primaryT}>{busy ? 'Signing in…' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={S.link}>
            <Text style={S.linkT}>New here? <Text style={{ color: T.accent }}>Create account</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  primary: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30,
             alignItems: 'center', marginTop: 8 },
  primaryT: { color: '#000', fontWeight: '800', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 16 },
  linkT: { color: T.muted, fontSize: 14 }
});
