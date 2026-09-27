import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Settings</Text></View>
      <View style={S.section}>
        <Text style={S.secTitle}>Account</Text>
        <TouchableOpacity style={S.item}><Text style={S.itemT}>Privacy & Safety</Text><Ionicons name="chevron-forward" size={18} color={T.muted} /></TouchableOpacity>
        <TouchableOpacity style={S.item}><Text style={S.itemT}>Security</Text><Ionicons name="chevron-forward" size={18} color={T.muted} /></TouchableOpacity>
        <TouchableOpacity style={S.item}><Text style={S.itemT}>Change Password</Text><Ionicons name="chevron-forward" size={18} color={T.muted} /></TouchableOpacity>
      </View>
      <View style={S.section}>
        <Text style={S.secTitle}>Preferences</Text>
        <View style={S.item}><Text style={S.itemT}>Dark Mode</Text><Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: T.accent }} /></View>
        <View style={S.item}><Text style={S.itemT}>Private Account</Text><Switch value={privateAccount} onValueChange={setPrivateAccount} trackColor={{ true: T.accent }} /></View>
      </View>
      <TouchableOpacity style={S.signOut} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text:'Cancel', style:'cancel' }, { text:'Sign Out', style:'destructive', onPress: signOut }])}>
        <Text style={S.signOutT}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  section: { marginTop:24, paddingHorizontal:16 },
  secTitle: { color:T.muted, fontSize:12, textTransform:'uppercase', letterSpacing:1, marginBottom:12 },
  item: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:16, borderBottomWidth:1, borderBottomColor:T.border },
  itemT: { color:T.text, fontSize:16 },
  signOut: { margin:24, padding:16, borderRadius:12, borderWidth:1, borderColor:T.danger, alignItems:'center' },
  signOutT: { color:T.danger, fontWeight:'800', fontSize:16 }
});
