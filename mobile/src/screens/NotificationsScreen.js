import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function NotificationsScreen() {
  const { state, markNotificationRead } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const icon = { like:'heart', comment:'chatbubble', friend_request:'person-add', share:'paper-plane' };
  const label = n => ({
    like: 'liked your post',
    comment: 'commented on your post',
    friend_request: 'sent you a friend request',
    share: 'shared your post'
  }[n.type] || 'interacted');

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Notifications</Text></View>
      <FlatList data={state.notifications} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const u = usersById[item.userId];
          return (
            <TouchableOpacity style={[S.row, !item.read && S.unread]}
              onPress={() => markNotificationRead(item.id)}>
              <View style={S.av} />
              <View style={{ flex:1 }}>
                <Text style={S.nm}>{u?.name} <Text style={S.hd}>{label(item)}</Text></Text>
              </View>
              <Ionicons name={(icon[item.type] || 'notifications')} size={20} color={T.accent} />
            </TouchableOpacity>
          );
        }} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  row: { flexDirection:'row', alignItems:'center', padding:16,
         borderBottomWidth:1, borderBottomColor:T.border },
  unread: { backgroundColor:'#0d1a17' },
  av: { width:44, height:44, borderRadius:22, backgroundColor:T.surface,
        borderWidth:1, borderColor:T.border, marginRight:12 },
  nm: { color:T.text, fontWeight:'bold', fontSize:14 },
  hd: { color:T.muted, fontWeight:'normal' }
});
