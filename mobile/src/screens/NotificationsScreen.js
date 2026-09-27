import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function NotificationsScreen() {
  const { state, clearNotifications, markNotificationRead } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const icons = { like:'heart', comment:'chatbubble', friend_request:'person-add', share:'repeat' };
  const label = n => ({ like:'liked your post', comment:'replied to your post',
    friend_request:'sent you a friend request', share:'reposted your post' }[n.type] || 'interacted');

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Notifications</Text>
        {state.notifications.length > 0 && (
          <TouchableOpacity onPress={clearNotifications}>
            <Ionicons name="checkmark-done" size={22} color={T.accent} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList data={state.notifications} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const u = usersById[item.userId];
          return (
            <TouchableOpacity style={[S.row, !item.read && S.unread]}
              onPress={() => markNotificationRead(item.id)}>
              <View style={[S.iconCircle, item.type === 'like' && { backgroundColor:'rgba(255,68,85,0.15)' }]}>
                <Ionicons name={icons[item.type] || 'notifications'}
                  size={18} color={item.type === 'like' ? T.danger : T.accent} />
              </View>
              <View style={{ flex:1, marginLeft:12 }}>
                <Text style={S.nm}>{u?.name || 'Someone'}</Text>
                <Text style={S.hd}>{label(item)}</Text>
              </View>
              {!item.read && <View style={S.dot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={T.muted} />
            <Text style={S.emptyT}>You're all caught up</Text>
          </View>
        } />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { flexDirection:'row', justifyContent:'space-between', alignItems:'center',
         padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  row: { flexDirection:'row', padding:16, borderBottomWidth:1, borderBottomColor:T.border, alignItems:'center' },
  unread: { backgroundColor:'#0d1a17' },
  iconCircle: { width:38, height:38, borderRadius:19, backgroundColor:'rgba(0,255,204,0.12)',
                alignItems:'center', justifyContent:'center' },
  nm: { color:T.text, fontWeight:'bold', fontSize:14 },
  hd: { color:T.muted, fontSize:13, marginTop:2 },
  dot: { width:8, height:8, borderRadius:4, backgroundColor:T.accent },
  empty: { padding:60, alignItems:'center', gap:12 },
  emptyT: { color:T.muted, fontSize:14 }
});
