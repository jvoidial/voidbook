import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { state, updateSettings } = useApp();
  const s = state.settings || {};

  const Row = ({ icon, label, value, onToggle, onPress, danger }) => (
    <TouchableOpacity style={S.item} onPress={onPress} disabled={!onPress && !onToggle}>
      <View style={S.itemLeft}>
        <Ionicons name={icon} size={20} color={danger ? T.danger : T.text} />
        <Text style={[S.itemT, danger && { color: T.danger }]}>{label}</Text>
      </View>
      {onToggle ? (
        <Switch value={!!value} onValueChange={onToggle} trackColor={{ true: T.accent, false: T.border }} />
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
          <Row icon="person-outline" label="Edit Profile" onPress={() => Alert.alert('Go to Profile tab to edit')} />
          <Row icon="lock-closed-outline" label="Privacy & Safety" onPress={() => Alert.alert('Privacy', 'Your data stays on device.')} />
          <Row icon="shield-checkmark-outline" label="Security" onPress={() => Alert.alert('Security', 'Session is stored locally.')} />
        </View>

        <View style={S.section}>
          <Text style={S.secTitle}>Preferences</Text>
          <Row icon="moon-outline" label="Dark Mode" value={s.darkMode} onToggle={v => updateSettings({ darkMode: v })} />
          <Row icon="notifications-outline" label="Notifications" value={s.notificationsOn} onToggle={v => updateSettings({ notificationsOn: v })} />
          <Row icon="eye-off-outline" label="Private Account" value={s.privateAccount} onToggle={v => updateSettings({ privateAccount: v })} />
        </View>

        <View style={S.section}>
          <Text style={S.secTitle}>About</Text>
          <Row icon="information-circle-outline" label="VOIDBOOK v1.0.0" onPress={() => Alert.alert('VOIDBOOK', 'The blackest social layer.')} />
        </View>

        <TouchableOpacity style={S.signOut} onPress={() => Alert.alert('Sign Out?', '', [
          { text:'Cancel', style:'cancel' },
          { text:'Sign Out', style:'destructive', onPress:signOut }
        ])}>
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
  signOut: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8,
             margin:24, padding:16, borderRadius:12, borderWidth:1, borderColor:T.danger },
  signOutT: { color:T.danger, fontWeight:'800', fontSize:15 }
});
