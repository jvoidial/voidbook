import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput,
  Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

const CATEGORIES = ['design', 'code', 'writing', 'music', 'photo', 'tutoring', 'other'];

const money = (cents) => {
  const n = Number(cents || 0) / 100;
  return n === 0 ? 'Free' : `$${n % 1 === 0 ? n : n.toFixed(2)}`;
};

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'other' });

  const load = useCallback(async () => {
    setError(null);
    const { data, error: e } = await supabase
      .from('marketplace_listings')
      .select('*, provider:profiles(*)')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('marketplace-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const openAdd = () => { setForm({ title: '', description: '', price: '', category: 'other' }); setModal(true); };

  const submit = async () => {
    if (!form.title.trim()) return;
    const cents = Math.max(0, Math.round(parseFloat(form.price || '0') * 100) || 0);
    try {
      setBusy(true);
      const { error: e } = await supabase.from('marketplace_listings').insert({
        provider_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price_cents: cents,
        category: form.category
      });
      if (e) throw e;
      setModal(false);
      await load();
    } catch (e) {
      Alert.alert('Could not publish', e.message);
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }) => {
    const provider = item.provider || {};
    const initial = (provider.name || '?')[0].toUpperCase();
    return (
      <View style={S.card}>
        <View style={S.cardTop}>
          <View style={S.av}>
            <Text style={S.avT}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={S.provider} numberOfLines={1}>
              {provider.name || 'Unknown'}{provider.handle ? `  @${provider.handle}` : ''}
            </Text>
          </View>
          <Text style={S.price}>{money(item.price_cents)}</Text>
        </View>
        {!!item.description && <Text style={S.desc} numberOfLines={3}>{item.description}</Text>}
        {!!item.category && <Text style={S.cat}>{item.category}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Marketplace</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={S.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={T.muted} />
          <Text style={S.emptyT}>Could not load listings</Text>
          <Text style={S.emptySub}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={T.accent} />}
          contentContainerStyle={{ paddingBottom: 96 }}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name="pricetags-outline" size={40} color={T.muted} />
              <Text style={S.emptyT}>No listings yet</Text>
              <Text style={S.emptySub}>Tap + to offer a skill.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={S.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color={T.bg} />
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={S.mOverlay}>
          <View style={S.sheet}>
            <View style={S.sheetHead}>
              <Text style={S.sheetTitle}>Add listing</Text>
              <TouchableOpacity onPress={() => setModal(false)} disabled={busy}>
                <Ionicons name="close" size={22} color={T.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={S.input} placeholder="Skill (e.g. Logo design)" placeholderTextColor={T.muted}
              value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))}
            />
            <TextInput
              style={S.input} placeholder="Price in dollars (0 = free)" placeholderTextColor={T.muted}
              keyboardType="decimal-pad"
              value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))}
            />

            <View style={S.chips}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[S.chip, form.category === cat && S.chipOn]}
                  onPress={() => setForm(f => ({ ...f, category: cat }))}
                >
                  <Text style={[S.chipT, form.category === cat && S.chipTOn]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[S.input, S.inputMulti]} placeholder="Description" placeholderTextColor={T.muted}
              multiline value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
            />

            <TouchableOpacity
              style={[S.cta, (!form.title.trim() || busy) && { opacity: 0.5 }]}
              disabled={!form.title.trim() || busy}
              onPress={submit}
            >
              {busy ? <ActivityIndicator color={T.bg} /> : <Text style={S.ctaT}>Publish listing</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  top: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  title: { color: T.text, fontSize: 20, fontWeight: '800' },
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
  avT: { color: T.text, fontWeight: '800', fontSize: 16 },
  cardTitle: { color: T.text, fontSize: 16, fontWeight: '800' },
  provider: { color: T.subText, fontSize: 13, marginTop: 2 },
  price: { color: T.text, fontSize: 16, fontWeight: '900' },
  desc: { color: T.subText, fontSize: 14, marginTop: 8, lineHeight: 19 },
  cat: { color: T.link, fontSize: 12, fontWeight: '700', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { padding: 60, alignItems: 'center', gap: 8 },
  emptyT: { color: T.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: T.muted, fontSize: 13 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: T.border },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: T.text, fontSize: 20, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: T.text, fontSize: 15, marginBottom: 12, backgroundColor: T.surface },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: T.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: T.accent, borderColor: T.accent },
  chipT: { color: T.subText, fontSize: 13, fontWeight: '600' },
  chipTOn: { color: T.bg },
  cta: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 4 },
  ctaT: { color: T.bg, fontWeight: '800', fontSize: 16 }
});
