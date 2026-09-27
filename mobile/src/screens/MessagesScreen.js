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
  const me = user?.id || 'me';
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
          <TouchableOpacity onPress={() => setActive(null)}>
            <Ionicons name="chevron-back" size={26} color={T.text} />
          </TouchableOpacity>
          <View style={{ flex:1, alignItems:'center' }}>
            <Text style={S.title}>{other?.name}</Text>
            <Text style={S.sub}>{other?.handle}</Text>
          </View>
          <View style={{ width:26 }} />
        </View>
        <FlatList data={conv.messages} keyExtractor={i => i.id}
          contentContainerStyle={{ padding:16, gap:8 }}
          renderItem={({ item }) => {
            const mine = item.from === me;
            return (
              <View style={[S.bubble, mine ? S.mine : S.theirs]}>
                <Text style={[S.bubT, mine && { color: '#000' }]}>{item.text}</Text>
              </View>
            );
          }} />
        <View style={S.inputRow}>
          <TextInput style={S.input} placeholder="Message" placeholderTextColor={T.muted}
            value={text} onChangeText={setText} />
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
        <TouchableOpacity onPress={() => setNewChat(true)}>
          <Ionicons name="create-outline" size={24} color={T.accent} />
        </TouchableOpacity>
      </View>
      <FlatList data={state.conversations} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const other = usersById[item.withUserId];
          const last = item.messages[item.messages.length - 1];
          return (
            <TouchableOpacity style={S.row} onPress={() => setActive(item.id)}>
              <View style={S.av}><Text style={S.avT}>{other?.name?.[0]}</Text></View>
              <View style={{ flex:1 }}>
                <Text style={S.nm}>{other?.name}</Text>
                <Text style={S.hd} numberOfLines={1}>{last?.text || 'Start the conversation'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.muted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={S.empty}>No conversations. Start a new chat.</Text>} />

      <Modal visible={newChat} transparent animationType="slide">
        <View style={S.modalBg}>
          <View style={S.modal}>
            <View style={S.modalHead}>
              <Text style={S.modalTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setNewChat(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>
            <FlatList data={state.users.filter(u => u.id !== me)}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={S.row} onPress={() => {
                  createConversation(item.id);
                  const existing = state.conversations.find(c => c.withUserId === item.id);
                  setActive(existing?.id || null);
                  setNewChat(false);
                }}>
                  <View style={S.av}><Text style={S.avT}>{item.name[0]}</Text></View>
                  <View style={{ flex:1 }}>
                    <Text style={S.nm}>{item.name}</Text>
                    <Text style={S.hd}>{item.handle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={T.muted} />
                </TouchableOpacity>
              )} />
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
  sub: { color:T.muted, fontSize:12 },
  row: { flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:46, height:46, borderRadius:23, backgroundColor:T.surface,
        alignItems:'center', justifyContent:'center', marginRight:12,
        borderWidth:1, borderColor:T.border },
  avT: { color:T.accent, fontWeight:'900', fontSize:16 },
  nm: { color:T.text, fontWeight:'bold', fontSize:15 },
  hd: { color:T.muted, fontSize:13, marginTop:2 },
  bubble: { padding:12, borderRadius:20, maxWidth:'78%' },
  mine: { backgroundColor:T.accent, alignSelf:'flex-end', borderBottomRightRadius:6 },
  theirs: { backgroundColor:T.surface, alignSelf:'flex-start', borderBottomLeftRadius:6 },
  bubT: { color:T.text, fontSize:15 },
  inputRow: { flexDirection:'row', padding:12, borderTopWidth:1, borderTopColor:T.border, alignItems:'center' },
  input: { flex:1, backgroundColor:T.surface, color:T.text, padding:12,
           borderRadius:22, borderWidth:1, borderColor:T.border },
  send: { backgroundColor:T.accent, width:42, height:42, borderRadius:21,
          alignItems:'center', justifyContent:'center', marginLeft:8 },
  empty: { color:T.muted, textAlign:'center', marginTop:40 },
  modalBg: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'flex-end' },
  modal: { backgroundColor:T.bg, borderTopLeftRadius:24, borderTopRightRadius:24,
           padding:20, maxHeight:'75%', borderTopWidth:1, borderColor:T.border },
  modalHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  modalTitle: { color:T.text, fontSize:20, fontWeight:'800' }
});
