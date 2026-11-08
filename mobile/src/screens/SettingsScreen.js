import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import PremiumModal from '../components/PremiumModal';
import { theme as T } from '../theme';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { signOut, changePassword, profile } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [premium, setPremium] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = !!profile?.is_admin;

  const confirmSignOut = () => Alert.alert('Sign Out?', 'You can sign back in any time.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: () => signOut() }
  ]);

  const closePw = () => { setPwOpen(false); setPw1(''); setPw2(''); };

  const savePassword = async () => {
    if (pw1.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');
    if (pw1 !== pw2) return Alert.alert('Passwords do not match', 'Please re-enter your new password.');
    setBusy(true);
    try {
      await changePassword(pw1);
      closePw();
      Alert.alert('Password updated', 'Use your new password next time you sign in.');
    } catch (e) {
      Alert.alert('Could not update password', e.message);
    } finally {
      setBusy(false);
    }
  };

  const Row = ({ icon, label, value, onPress, danger, locked }) => (
    <TouchableOpacity style={S.item} onPress={onPress} disabled={!onPress}>
      <View style={S.itemLeft}>
        <Ionicons name={icon} size={20} color={danger ? T.danger : T.text} />
        <Text style={[S.itemT, danger && { color: T.danger }]}>{label}</Text>
      </View>
      {locked ? (
        <View style={S.locked}>
          <Text style={S.lockedT}>{value}</Text>
          <Ionicons name="lock-closed" size={12} color={T.muted} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={T.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Settings</Text></View>
      <ScrollView>
        <View style={S.section}>
          <Text style={S.secTitle}>Account</Text>
          <Row icon="person-outline" label="Edit Profile" onPress={() => nav.navigate('Profile')} />
          <Row icon="key-outline" label="Change Password" onPress={() => setPwOpen(true)} />
          <Row icon="lock-closed-outline" label="Privacy & Safety"
            onPress={() => Alert.alert('Privacy & Safety', 'Posts are public. Your email is never shown to other users.')} />
          <Row icon="shield-checkmark-outline" label="Security"
            onPress={() => Alert.alert('Security', 'Your session is stored securely on this device and refreshed automatically.')} />
        </View>

        {!profile?.is_premium && (
          <View style={S.section}>
            <Text style={S.secTitle}>Premium</Text>
            <Row icon="checkmark-circle-outline" label="Get sqawk Premium" onPress={() => setPremium(true)} />
          </View>
        )}

        <View style={S.section}>
          <Text style={S.secTitle}>Appearance</Text>
          {/* sqawk is strictly black & white, so the theme is fixed rather than a toggle. */}
          <Row icon="moon-outline" label="Dark Mode" value="Always On" locked />
        </View>

        <View style={S.section}>
          <Text style={S.secTitle}>About</Text>
          <Row icon="information-circle-outline" label="sqawk v1.0.0"
            onPress={() => Alert.alert('sqawk', 'A black and white social layer.')} />
        </View>

        {isAdmin && (
          <View style={S.section}>
            <Text style={S.secTitle}>Admin</Text>
            <Row icon="construct-outline" label="Admin Panel" onPress={() => nav.navigate('Admin')} />
          </View>
        )}

        <TouchableOpacity style={S.signOut} onPress={confirmSignOut}>
          <Ionicons name="log-out-outline" size={20} color={T.danger} />
          <Text style={S.signOutT}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={pwOpen} transparent animationType="slide" onRequestClose={closePw}>
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Change Password</Text>
            <Text style={S.modalSub}>Pick something long and unique.</Text>

            <TextInput style={S.in} placeholder="New password" placeholderTextColor={T.muted}
              secureTextEntry value={pw1} onChangeText={setPw1} />
            <TextInput style={S.in} placeholder="Confirm new password" placeholderTextColor={T.muted}
              secureTextEntry value={pw2} onChangeText={setPw2} />
            {pw2.length > 0 && pw1 !== pw2 && (
              <Text style={S.warn}>Passwords do not match</Text>
            )}

            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={closePw}>
                <Text style={S.cancelT}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.go} disabled={busy} onPress={savePassword}>
                <Text style={S.goT}>{busy ? 'Saving…' : 'Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PremiumModal visible={premium} onClose={() => setPremium(false)} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  section: { marginTop:24, paddingHorizontal:16 },
  secTitle: { color:T.muted, fontSize:12, textTransform:'uppercase', letterSpacing:1, marginBottom:8 },
  item: { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
          paddingVertical:16, borderBottomWidth:1, borderBottomColor:T.border },
  itemLeft: { flexDirection:'row', alignItems:'center', gap:12 },
  itemT: { color:T.text, fontSize:15 },
  locked: { flexDirection:'row', alignItems:'center', gap:6 },
  lockedT: { color:T.muted, fontSize:13, fontWeight:'600' },
  signOut: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
             margin:24, padding:16, borderRadius:12, borderWidth:1, borderColor:T.danger },
  signOutT: { color:T.danger, fontWeight:'800', fontSize:15 },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'center', padding:24 },
  modal: { backgroundColor:T.surface, borderRadius:20, padding:24, borderWidth:1, borderColor:T.border },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800' },
  modalSub: { color:T.muted, fontSize:13, marginTop:6, marginBottom:18 },
  in: { backgroundColor:T.bg, color:T.text, padding:14, borderRadius:12,
        borderWidth:1, borderColor:T.border, marginBottom:12 },
  warn: { color:T.danger, fontSize:12, marginTop:-6, marginBottom:8 },
  modalActions: { flexDirection:'row', gap:12, marginTop:8 },
  cancel: { flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' },
  go: { flex:1, padding:14, borderRadius:12, backgroundColor:T.accent, alignItems:'center' },
  goT: { color:'#000', fontWeight:'800' }
});
