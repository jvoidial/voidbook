import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function NotificationsScreen() {
  const nav = useNavigation();
  const { state, clearNotifications, markNotificationRead } = useApp();
  const usersById = Object.fromEntries((state.users || []).map(u => [u.id, u]));
  const icons = { like:'heart', comment:'chatbubble', follow:'person-add', friend_request:'person-add', share:'repeat', mention:'at' };
  const label = n => ({ like:'liked your post', comment:'replied to your post',
    follow:'followed you', friend_request:'sent you a friend request',
    share:'reposted your post', mention:'mentioned you' }[n.type] || 'interacted with you');

  // Tapping a notification opens the thing it is about. push() bubbles from this
  // tab to the root stack (the tab's helpers inherit the stack's actions), so the
  // target opens as a new screen on top. `target_id` is polymorphic: the follower
  // for a follow, otherwise the post the actor interacted with (see
  // 007_notifications.sql). `userId` is the mapped `actor_id`.
  const open = (n) => {
    if (n.type === 'follow') nav.push('UserProfile', { userId: n.target_id || n.userId });
    else if (n.target_id) nav.push('PostDetail', { postId: n.target_id });
    else if (n.userId) nav.push('UserProfile', { userId: n.userId });
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}>
        <Text style={S.title}>Notifications</Text>
        {(state.notifications || []).length > 0 && (
          <TouchableOpacity onPress={clearNotifications}>
            <Ionicons name="checkmark-done" size={22} color={T.link} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList data={state.notifications || []} keyExtractor={i => i.id}
        renderItem={({ item }) => {
          const u = usersById[item.userId];
          return (
            <TouchableOpacity style={[S.row, !item.read && S.unread]}
              onPress={() => { markNotificationRead(item.id); open(item); }}>
              <View style={[S.iconCircle, item.type === 'like' && { backgroundColor: T.dangerDim }]}>
                <Ionicons name={icons[item.type] || 'notifications'}
                  size={18} color={item.type === 'like' ? T.danger : T.link} />
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
  unread: { backgroundColor: T.surface },
  iconCircle: { width:38, height:38, borderRadius:19, backgroundColor: T.linkDim,
                alignItems:'center', justifyContent:'center' },
  nm: { color:T.text, fontWeight:'bold', fontSize:14 },
  hd: { color:T.muted, fontSize:13, marginTop:2 },
  dot: { width:8, height:8, borderRadius:4, backgroundColor:T.link },
  empty: { padding:60, alignItems:'center', gap:12 },
  emptyT: { color:T.muted, fontSize:14 }
});
