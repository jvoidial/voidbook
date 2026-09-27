import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function MarketplaceScreen() {
  const { state, addListing } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', price: '', desc: '' });

  const submit = () => {
    if (!form.title || !form.price) return Alert.alert('Error', 'Title and price required.');
    addListing({ ...form, price: Number(form.price) });
    setForm({ title: '', price: '', desc: '' });
    setModal(false);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Marketplace</Text>
        <TouchableOpacity style={S.addBtn} onPress={() => setModal(true)}>
          <Ionicons name="add" size={20} color="#000" />
          <Text style={S.addT}>Sell</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={state.listings} keyExtractor={i => i.id} numColumns={2}
        columnWrapperStyle={{ gap:8, paddingHorizontal:12 }}
        contentContainerStyle={{ gap:8, paddingVertical:12 }}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.img}><Ionicons name="cube-outline" size={32} color={T.muted} /></View>
            <Text style={S.price}>£{item.price}</Text>
            <Text style={S.nm} numberOfLines={1}>{item.title}</Text>
            <Text style={S.hd} numberOfLines={1}>{item.desc}</Text>
          </View>
        )} />

      <Modal visible={modal} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>New Listing</Text>
            <TextInput style={S.in} placeholder="Title" placeholderTextColor={T.muted} value={form.title} onChangeText={t => setForm({...form, title:t})} />
            <TextInput style={S.in} placeholder="Price (£)" placeholderTextColor={T.muted} keyboardType="numeric" value={form.price} onChangeText={t => setForm({...form, price:t})} />
            <TextInput style={[S.in, { height: 80 }]} placeholder="Description" placeholderTextColor={T.muted} multiline value={form.desc} onChangeText={t => setForm({...form, desc:t})} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setModal(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={S.goBtn} onPress={submit}><Text style={S.goT}>List Item</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  addBtn: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:T.accent, paddingHorizontal:14, paddingVertical:8, borderRadius:20 },
  addT: { color:'#000', fontWeight:'800', fontSize:13 },
  card: { flex:1, backgroundColor:T.surface, borderRadius:12, padding:10, borderWidth:1, borderColor:T.border },
  img: { height:110, backgroundColor:T.card, borderRadius:8, marginBottom:8, alignItems:'center', justifyContent:'center' },
  price: { color:T.accent, fontWeight:'bold', fontSize:15 },
  nm: { color:T.text, fontWeight:'600', marginTop:2 },
  hd: { color:T.muted, fontSize:11 },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', padding:24 },
  modal: { backgroundColor:T.surface, borderRadius:20, padding:24, borderWidth:1, borderColor:T.border },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  in: { backgroundColor:T.bg, color:T.text, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, marginBottom:12 },
  modalActions: { flexDirection:'row', gap:12, marginTop:8 },
  cancelBtn: { flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' },
  goBtn: { flex:1, padding:14, borderRadius:12, backgroundColor:T.accent, alignItems:'center' },
  goT: { color:'#000', fontWeight:'800' }
});
