import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function MessagesScreen() {
  const { state, sendMessage } = useApp();
  const [active, setActive] = useState(null);
  const [text, setText] = useState('');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  if (active) {
    const conv = state.conversations.find(c => c.id === active);
    const other = usersById[conv.withUserId];
    return (
      <SafeAreaView style={S.c} edges={['top']}>
        <View style={S.top}>
          <TouchableOpacity onPress={() => setActive(null)}>
            <Text style={S.back}>←</Text>
          </TouchableOpacity>
          <Text style={S.title}>{other?.name}</Text>
        </View>
        <FlatList data={conv.messages} keyExtractor={i => i.id}
          contentContainerStyle={{ padding:16 }}
          renderItem={({ item }) => (
            <View style={[S.bubble, item.from === 'me' ? S.mine : S.theirs]}>
              <Text style={S.bubT}>{item.text}</Text>
            </View>
          )} />
        <View style={S.inputRow}>
          <TextInput style={S.input} placeholder="Message..." placeholderTextColor={T.muted}
            value={text} onChangeText={setText} />
          <TouchableOpacity style={S.send}
            onPress={() => { if (text.trim()) { sendMessage(active, text); setText(''); } }}>
            <Text style={S.sendT}>Send</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Messages</Text></View>
      <FlatList data={state.conversations} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const other = usersById[item.withUserId];
          const last = item.messages[item.messages.length - 1];
          return (
            <TouchableOpacity style={S.row} onPress={() => setActive(item.id)}>
              <View style={S.av} />
              <View style={{ flex:1 }}>
                <Text style={S.nm}>{other?.name}</Text>
                <Text style={S.hd} numberOfLines={1}>{last?.text}</Text>
              </View>
            </TouchableOpacity>
          );
        }} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border,
         flexDirection:'row', alignItems:'center', gap:12 },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  back: { color:T.accent, fontSize:22, fontWeight:'bold' },
  row: { flexDirection:'row', alignItems:'center', padding:16,
         borderBottomWidth:1, borderBottomColor:T.border },
  av: { width:44, height:44, borderRadius:22, backgroundColor:T.surface,
        borderWidth:1, borderColor:T.border, marginRight:12 },
  nm: { color:T.text, fontWeight:'bold' },
  hd: { color:T.muted, fontSize:12, marginTop:2 },
  bubble: { padding:10, borderRadius:16, marginBottom:8, maxWidth:'75%' },
  mine: { backgroundColor:T.accent, alignSelf:'flex-end' },
  theirs: { backgroundColor:T.surface, alignSelf:'flex-start' },
  bubT: { color:T.text },
  inputRow: { flexDirection:'row', padding:12, borderTopWidth:1, borderTopColor:T.border },
  input: { flex:1, backgroundColor:T.surface, color:T.text, padding:10,
           borderRadius:20, borderWidth:1, borderColor:T.border },
  send: { backgroundColor:T.accent, paddingHorizontal:16, justifyContent:'center',
          borderRadius:20, marginLeft:8 },
  sendT: { color:'#000', fontWeight:'bold' }
});
