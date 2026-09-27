import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function WatchScreen() {
  const { state, goLive, endLive } = useApp();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const start = () => {
    if (!title.trim()) return Alert.alert('Title required');
    goLive(title); setTitle(''); setModal(false);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Watch</Text>
        <TouchableOpacity style={S.liveBtn} onPress={() => setModal(true)}>
          <View style={S.liveDot} />
          <Text style={S.liveT}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={state.watch} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const u = usersById[item.userId] || { name: 'You' };
          return (
            <View style={S.card}>
              <View style={S.thumb}>
                <Ionicons name="videocam" size={56} color={item.live ? T.danger : T.accent} />
                {item.live && <View style={S.liveBadge}><Text style={S.liveBadgeT}>● LIVE</Text></View>}
              </View>
              <Text style={S.nm}>{item.title}</Text>
              <Text style={S.hd}>{u.name} · {item.views.toLocaleString()} views</Text>
              {item.live && (
                <TouchableOpacity style={S.endBtn} onPress={() => endLive(item.id)}>
                  <Text style={S.endBtnT}>End Stream</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }} />

      <Modal visible={modal} transparent animationType="fade">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Start Live Stream</Text>
            <TextInput style={S.in} placeholder="Stream title" placeholderTextColor={T.muted}
              value={title} onChangeText={setTitle} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancel} onPress={() => setModal(false)}>
                <Text style={S.cancelT}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.go} onPress={start}>
                <Text style={S.goT}>Go Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
         padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  liveBtn: { flexDirection:'row', alignItems:'center', gap:8,
             backgroundColor:T.accent, paddingHorizontal:14, paddingVertical:8, borderRadius:20 },
  liveDot: { width:8, height:8, borderRadius:4, backgroundColor:'#000' },
  liveT: { color:'#000', fontWeight:'800', fontSize:13 },
  card: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  thumb: { height:200, backgroundColor:T.surface, borderRadius:12,
           borderWidth:1, borderColor:T.border, alignItems:'center',
           justifyContent:'center', marginBottom:12, position:'relative' },
  liveBadge: { position:'absolute', top:12, left:12, backgroundColor:T.danger,
               paddingHorizontal:10, paddingVertical:5, borderRadius:6 },
  liveBadgeT: { color:'#FFF', fontWeight:'900', fontSize:11, letterSpacing:1 },
  nm: { color:T.text, fontWeight:'bold', fontSize:16 },
  hd: { color:T.muted, fontSize:13, marginTop:4 },
  endBtn: { marginTop:12, padding:12, borderRadius:10,
            borderWidth:1, borderColor:T.danger, alignItems:'center' },
  endBtnT: { color:T.danger, fontWeight:'700' },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.85)', justifyContent:'center', padding:24 },
  modal: { backgroundColor:T.surface, borderRadius:20, padding:24, borderWidth:1, borderColor:T.border },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  in: { backgroundColor:T.bg, color:T.text, padding:14, borderRadius:12,
        borderWidth:1, borderColor:T.border, marginBottom:20 },
  modalActions: { flexDirection:'row', gap:12 },
  cancel: { flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' },
  go: { flex:1, padding:14, borderRadius:12, backgroundColor:T.accent, alignItems:'center' },
  goT: { color:'#000', fontWeight:'800' }
});
