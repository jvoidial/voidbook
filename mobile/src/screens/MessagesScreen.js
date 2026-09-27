import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { theme as T } from '../theme';

export default function MessagesScreen() {
  const { state, sendMessage, createConversation } = useApp();
  const { user } = useAuth();
  const [active, setActive] = useState(null);
  const [text, setText] = useState('');
  const [newChat, setNewChat] = useState(false);
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  if (active) {
    const conv = state.conversations.find(c => c.id === active);
    const other = usersById[conv.withUserId];
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        <View style={S.top}>
          <TouchableOpacity onPress={() => setActive(null)}><Ionicons name="chevron-back" size={24} color={T.text} /></TouchableOpacity>
          <Text style={S.title}>{other?.name}</Text>
          <View style={{width:24}} />
        </View>
        <FlatList data={conv.messages} keyExtractor={i => i.id} contentContainerStyle={{ padding:16 }}
          renderItem={({ item }) => {
            const isMine = item.from === (user?.id || 'me');
            return (
              <View style={[S.bubble, isMine ? S.mine : S.theirs]}>
                <Text style={[S.bubT, isMine && { color: '#000' }]}>{item.text}</Text>
              </View>
            );
          }} />
        <View style={S.inputRow}>
          <TextInput style={S.input} placeholder="Start a message" placeholderTextColor={T.muted} value={text} onChangeText={setText} />
          <TouchableOpacity style={S.send} onPress={() => { if (text.trim()) { sendMessage(active, text); setText(''); } }}>
            <Ionicons name="send" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Messages</Text>
        <TouchableOpacity onPress={() => setNewChat(true)}><Ionicons name="create-outline" size={22} color={T.accent} /></TouchableOpacity>
      </View>
      <FlatList data={state.conversations} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const other = usersById[item.withUserId];
          const last = item.messages[item.messages.length - 1];
          return (
            <TouchableOpacity style={S.row} onPress={() => setActive(item.id)}>
              <View style={S.av}><Text style={S.avT}>{other?.name?.[0]?.toUpperCase()}</Text></View>
              <View style={{ flex:1 }}>
                <Text style={S.nm}>{other?.name}</Text>
                <Text style={S.hd} numberOfLines={1}>{last?.text || 'Start a conversation'}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={{ color: T.muted, textAlign: 'center', marginTop: 40 }}>No messages yet. Start a chat!</Text>} />

      <Modal visible={newChat} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <Text style={S.modalTitle}>New Message</Text>
            <FlatList data={state.users.filter(u => u.id !== user?.id && u.id !== 'me')} keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={S.userRow} onPress={() => { createConversation(item.id); setNewChat(false); }}>
                  <View style={S.av}><Text style={S.avT}>{item.name[0]}</Text></View>
                  <Text style={S.nm}>{item.name}</Text>
                </TouchableOpacity>
              )} />
            <TouchableOpacity style={S.cancelBtn} onPress={() => setNewChat(false)}><Text style={S.cancelT}>Cancel</Text></TouchableOpacity>
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
  row: { flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:44, height:44, borderRadius:22, backgroundColor:T.surface, borderWidth:1, borderColor:T.border, marginRight:12, alignItems:'center', justifyContent:'center' },
  avT: { color:T.accent, fontWeight:'900', fontSize:16 },
  nm: { color:T.text, fontWeight:'bold' },
  hd: { color:T.muted, fontSize:12, marginTop:2 },
  bubble: { padding:12, borderRadius:18, marginBottom:8, maxWidth:'75%' },
  mine: { backgroundColor:T.accent, alignSelf:'flex-end', borderBottomRightRadius:4 },
  theirs: { backgroundColor:T.surface, alignSelf:'flex-start', borderBottomLeftRadius:4 },
  bubT: { color:T.text, fontSize:15 },
  inputRow: { flexDirection:'row', padding:12, borderTopWidth:1, borderTopColor:T.border, alignItems:'center' },
  input: { flex:1, backgroundColor:T.surface, color:T.text, padding:12, borderRadius:20, borderWidth:1, borderColor:T.border },
  send: { backgroundColor:T.accent, width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', marginLeft:8 },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.8)', justifyContent:'flex-end' },
  modal: { backgroundColor:T.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:'70%' },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800', marginBottom:16 },
  userRow: { flexDirection:'row', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderBottomColor:T.border },
  cancelBtn: { marginTop:20, padding:14, borderRadius:12, backgroundColor:T.bg, alignItems:'center' },
  cancelT: { color:T.text, fontWeight:'700' }
});
