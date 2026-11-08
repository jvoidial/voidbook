import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BlueCheck, { isVerified } from '../components/BlueCheck';
import { theme as T } from '../theme';

export default function AdminScreen({ navigation }) {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500);
      if (!alive) return;
      if (error) Alert.alert('Could not load users', error.message);
      setUsers(data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // The button is hidden for non-admins, but the guard belongs here too: the
  // RPC is the real boundary, and this keeps a stale screen from offering it.
  const authorised = !!profile?.is_admin;

  const toggle = async (u) => {
    const next = !isVerified(u);
    setBusyId(u.id);
    // Optimistic: flip locally, then reconcile with whatever the DB returns.
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_verified: next, verified: next } : x));
    const { error } = await supabase.rpc('admin_set_verified', { target_id: u.id, value: next });
    setBusyId(null);
    if (error) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_verified: !next, verified: !next } : x));
      Alert.alert('Update failed', error.message);
    }
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(term) || (u.handle || '').toLowerCase().includes(term));
  }, [q, users]);

  const verifiedCount = users.filter(isVerified).length;

  if (!authorised) {
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        <View style={S.top}><Text style={S.title}>Admin</Text></View>
        <View style={S.center}>
          <Ionicons name="lock-closed-outline" size={56} color={T.muted} />
          <Text style={S.msg}>Admins only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={S.title}>Admin</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={S.statsBar}>
        <Text style={S.stat}><Text style={S.statNum}>{users.length}</Text> users</Text>
        <Text style={S.stat}><Text style={S.statNum}>{verifiedCount}</Text> verified</Text>
      </View>

      <View style={S.searchWrap}>
        <Ionicons name="search" size={18} color={T.muted} />
        <TextInput style={S.search} placeholder="Search users" placeholderTextColor={T.muted}
          autoCapitalize="none" value={q} onChangeText={setQ} />
      </View>

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={i => i.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const on = isVerified(item);
            return (
              <View style={S.row}>
                <View style={S.av}>
                  {item.avatar_url
                    ? <Image source={{ uri: item.avatar_url }} style={S.avImg} />
                    : <Text style={S.avT}>{(item.name || '?')[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={S.nmRow}>
                    <Text style={S.nm} numberOfLines={1}>{item.name}</Text>
                    {on && <BlueCheck user={item} size={14} />}
                    {item.is_admin && <Text style={S.adminTag}>ADMIN</Text>}
                  </View>
                  <Text style={S.hd} numberOfLines={1}>@{item.handle}</Text>
                </View>
                <TouchableOpacity
                  style={[S.btn, on ? S.btnOff : S.btnOn, busyId === item.id && { opacity: 0.5 }]}
                  disabled={busyId === item.id}
                  onPress={() => toggle(item)}>
                  <Text style={[S.btnT, on ? S.btnTOff : S.btnTOn]}>{on ? 'Unverify' : 'Verify'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={S.empty}>No users match "{q}"</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
         padding: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  msg: { color: T.text, fontSize: 18, fontWeight: 'bold' },
  statsBar: { flexDirection: 'row', gap: 24, paddingHorizontal: 16, paddingVertical: 12 },
  stat: { color: T.muted, fontSize: 13 },
  statNum: { color: T.text, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface,
                marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, height: 42,
                borderRadius: 20, borderWidth: 1, borderColor: T.border },
  search: { flex: 1, color: T.text, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16,
         borderBottomWidth: 1, borderBottomColor: T.border },
  av: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.surface,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
        borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  avImg: { width: '100%', height: '100%' },
  avT: { color: T.text, fontWeight: '900', fontSize: 16 },
  nmRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nm: { color: T.text, fontWeight: 'bold' },
  adminTag: { color: T.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1,
              borderWidth: 1, borderColor: T.border, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  hd: { color: T.muted, fontSize: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  btnOn: { backgroundColor: T.accent, borderColor: T.accent },
  btnOff: { backgroundColor: 'transparent', borderColor: T.border },
  btnT: { fontSize: 12, fontWeight: '800' },
  btnTOn: { color: '#000' },
  btnTOff: { color: T.text },
  empty: { color: T.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 }
});
