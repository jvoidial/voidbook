import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput,
  Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { payForProduct, confirmProduct } from '../lib/payments';
import { theme as T } from '../theme';

const TABS = ['Businesses', 'Communities'];
const CATEGORIES = ['food', 'retail', 'services', 'health', 'arts', 'other'];

export default function LocalScreen() {
  const { user } = useAuth();
  // Safe outside StripeProvider: returns null, which payForProduct treats as
  // "Stripe not configured" and skips the payment step.
  const { initPaymentSheet, presentPaymentSheet } = useStripe() || {};
  const [tab, setTab] = useState('Businesses');
  const [rows, setRows] = useState({ Businesses: [], Communities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', category: 'other', description: '' });

  const table = tab === 'Businesses' ? 'businesses' : 'communities';

  const load = useCallback(async () => {
    setError(null);
    const [biz, comm] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at', { ascending: false }),
      supabase.from('communities').select('*').order('created_at', { ascending: false })
    ]);
    const err = biz.error || comm.error;
    if (err) setError(err.message);
    setRows({ Businesses: biz.data || [], Communities: comm.data || [] });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('local-directory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communities' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const openAdd = () => { setForm({ name: '', city: '', category: 'other', description: '' }); setModal(true); };

  const submit = async () => {
    if (!form.name.trim()) return;
    try {
      setBusy(true);

      // A business listing costs $1. Collect it before inserting so a listing is
      // never created unpaid. With Stripe unconfigured `skipped` is true and the
      // listing proceeds, keeping the flow usable in dev builds.
      let paid = false;
      if (tab === 'Businesses') {
        const result = await payForProduct({
          product: 'business_listing',
          initPaymentSheet,
          presentPaymentSheet,
        });
        if (!result.paid && !result.skipped) return; // user cancelled
        if (result.paid) {
          // Ask the server to verify the charge before recording it, so `paid`
          // reflects a confirmed payment rather than the sheet's word.
          await confirmProduct({ product: 'business_listing', paymentIntentId: result.paymentIntentId });
          paid = true;
        }
      }

      // `paid` reflects an actual completed charge, not just that the step ran.
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        city: form.city.trim(),
        description: form.description.trim(),
        ...(tab === 'Businesses' ? { category: form.category, paid } : {})
      };
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      setModal(false);
      await load();
      if (tab === 'Businesses') {
        Alert.alert('Listed', paid ? 'Your business is live.' : 'Your business is live (listing fee not charged — payments are not configured).');
      }
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={S.card}>
      <View style={S.cardHead}>
        <Text style={S.cardTitle} numberOfLines={1}>{item.name}</Text>
        {!!item.city && (
          <View style={S.pill}>
            <Ionicons name="location-outline" size={12} color={T.subText} />
            <Text style={S.pillT}>{item.city}</Text>
          </View>
        )}
      </View>
      {!!item.category && <Text style={S.cat}>{item.category}</Text>}
      {!!item.description && <Text style={S.desc} numberOfLines={3}>{item.description}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Local</Text>
      </View>

      <View style={S.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[S.tab, tab === t && S.tabOn]} onPress={() => setTab(t)}>
            <Text style={[S.tabT, tab === t && S.tabTOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={T.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={S.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={T.muted} />
          <Text style={S.emptyT}>Could not load {tab}</Text>
          <Text style={S.emptySub}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rows[tab]}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={T.accent} />}
          contentContainerStyle={{ paddingBottom: 96 }}
          ListEmptyComponent={
            <View style={S.empty}>
              <Ionicons name={tab === 'Businesses' ? 'storefront-outline' : 'people-outline'} size={40} color={T.muted} />
              <Text style={S.emptyT}>Nothing here yet</Text>
              <Text style={S.emptySub}>Tap + to add the first one.</Text>
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
              <Text style={S.sheetTitle}>Add {tab === 'Businesses' ? 'business' : 'community'}</Text>
              <TouchableOpacity onPress={() => setModal(false)} disabled={busy}>
                <Ionicons name="close" size={22} color={T.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={S.input} placeholder="Name" placeholderTextColor={T.muted}
              value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />
            <TextInput
              style={S.input} placeholder="City" placeholderTextColor={T.muted}
              value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))}
            />

            {tab === 'Businesses' && (
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
            )}

            <TextInput
              style={[S.input, S.inputMulti]} placeholder="Description" placeholderTextColor={T.muted}
              multiline value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))}
            />

            {tab === 'Businesses' && (
              <View style={S.feeRow}>
                <Ionicons name="pricetag-outline" size={16} color={T.link} />
                <Text style={S.feeT}>$1 listing fee (simulated)</Text>
              </View>
            )}

            <TouchableOpacity
              style={[S.cta, (!form.name.trim() || busy) && { opacity: 0.5 }]}
              disabled={!form.name.trim() || busy}
              onPress={submit}
            >
              {busy ? <ActivityIndicator color={T.bg} /> : <Text style={S.ctaT}>Publish</Text>}
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.divider },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: T.text },
  tabT: { color: T.subText, fontWeight: '700', fontSize: 15 },
  tabTOn: { color: T.text },
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: T.text, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: T.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillT: { color: T.subText, fontSize: 11, fontWeight: '600' },
  cat: { color: T.link, fontSize: 12, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  desc: { color: T.subText, fontSize: 14, marginTop: 6, lineHeight: 19 },
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
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  feeT: { color: T.subText, fontSize: 13, fontWeight: '600' },
  cta: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30, alignItems: 'center' },
  ctaT: { color: T.bg, fontWeight: '800', fontSize: 16 }
});
