import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function WatchScreen() {
  const { state, goLive } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');

  const startLive = () => {
    if (!streamTitle.trim()) return Alert.alert('Error', 'Give your stream a title.');
    goLive(streamTitle);
    setStreamTitle('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Watch</Text>
        <TouchableOpacity style={S.liveBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="radio-outline" size={18} color="#000" />
          <Text style={S.liveT}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={state.watch} keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.thumb}>
              <Ionicons name="videocam" size={48} color={item.live ? T.danger : T.accent} />
              {item.live && <View style={S.liveBadge}><Text style={S.liveBadgeT}>LIVE</Text></View>}
            </View>
            <Text style={S.nm}>{item.title}</Text>
            <Text style={S.hd}>{item.views.toLocaleString()} views</Text>
          </View>
        )} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>Start a Live Stream</Text>
            <TextInput style={S.modalInput} placeholder="Stream title" placeholderTextColor={T.muted} value={streamTitle} onChangeText={setStreamTitle} />
            <View style={S.modalActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setModalVisible(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={S.goBtn} onPress={startLive}><Text style={S.goT}>Go Live</Text></TouchableOpacity>
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
  liveBtn: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:T.accent, paddingHorizontal:14, paddingVertical:8, borderRadius:20 },
  liveT: { color:'#000', fontWeight:'800', fontSize:13 },
  card: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  thumb: { height:180, backgroundColor:T.surface, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center', justifyContent:'center', marginBottom:10 },
  liveBadge: { position:'absolute', top:12, left:12, backgroundColor:T.danger, paddingHorizontal:8, paddingVertical:4, borderRadius:4 },
  liveBadgeT: { color:'#FFF', fontWeight:'900', fontSize:10 },
  nm: { color:T.text, fontWeight:'bold', fontSize:16 },
  hd: { color:T.muted, fontSize:13, marginTop:4 },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'center', padding:24 },
  modal: { backgroundColor:T.surface, borderRadius:20, padding:24, borderWidth:1, borderColor:T.border },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  modalInput: { backgroundColor:T.bg, color:T.text, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, marginBottom:20 },
  modalActions: { flexDirection:'row', gap:12 },
  cancelBtn: { flex:1, padding:14, borderRadius:12, borderWidth:1, borderColor:T.border, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' },
  goBtn: { flex:1, padding:14, borderRadius:12, backgroundColor:T.accent, alignItems:'center' },
  goT: { color:'#000', fontWeight:'800' }
});
