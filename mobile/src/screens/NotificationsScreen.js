import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function NotificationsScreen() {
  const { state, clearNotifications } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const icons = { like:'heart', comment:'chatbubble', friend_request:'person-add', share:'paper-plane' };
  const label = n => ({ like:'liked your post', comment:'replied to your post', friend_request:'sent you a friend request', share:'reposted your post' }[n.type] || 'interacted');

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Notifications</Text>
        <TouchableOpacity onPress={clearNotifications}><Ionicons name="checkmark-done" size={22} color={T.accent} /></TouchableOpacity>
      </View>
      <FlatList data={state.notifications} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const u = usersById[item.userId];
          return (
            <View style={[S.row, !item.read && S.unread]}>
              <Ionicons name={icons[item.type] || 'notifications'} size={20} color={T.accent} style={{ marginTop: 4 }} />
              <View style={{ flex:1, marginLeft: 12 }}>
                <Text style={S.nm}>{u?.name || 'Someone'}</Text>
                <Text style={S.hd}>{label(item)}</Text>
              </View>
            </View>
          );
        }} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  row: { flexDirection:'row', padding:16, borderBottomWidth:1, borderBottomColor:T.border, alignItems:'flex-start' },
  unread: { backgroundColor:'#0d1a17' },
  nm: { color:T.text, fontWeight:'bold', fontSize:14 },
  hd: { color:T.muted, fontSize:13, marginTop:2 }
});
