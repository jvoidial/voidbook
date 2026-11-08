import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { signOut } = useAuth();

  const confirmSignOut = () => Alert.alert('Sign Out?', 'You can sign back in any time.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: () => signOut() }
  ]);

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
          <Row icon="lock-closed-outline" label="Privacy & Safety"
            onPress={() => Alert.alert('Privacy & Safety', 'Posts are public. Your email is never shown to other users.')} />
          <Row icon="shield-checkmark-outline" label="Security"
            onPress={() => Alert.alert('Security', 'Your session is stored securely on this device and refreshed automatically.')} />
        </View>

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

        <TouchableOpacity style={S.signOut} onPress={confirmSignOut}>
          <Ionicons name="log-out-outline" size={20} color={T.danger} />
          <Text style={S.signOutT}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  signOutT: { color:T.danger, fontWeight:'800', fontSize:15 }
});

