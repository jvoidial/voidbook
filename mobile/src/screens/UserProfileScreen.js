import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: me } = useAuth();
  const { state, toggleFollow, createConversation, reportItem } = useApp();
  const u = state.users.find(x => x.id === userId) || { name: 'Unknown', handle: '@unknown', followers: 0, following: 0, bio: '' };
  const usersById = Object.fromEntries(state.users.map(x => [x.id, x]));
  const posts = state.posts.filter(p => p.userId === userId);
  const isFollowing = state.follows.following.includes(userId);
  const isSelf = me?.id === userId;

  const message = () => {
    createConversation(userId);
    navigation.navigate('Messages');
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={S.title}>{u.name}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Options', '', [
          { text:'Report', style:'destructive', onPress:() => { reportItem('user', userId, 'inappropriate'); Alert.alert('Reported'); } },
          { text:'Cancel', style:'cancel' }
        ])}>
          <Ionicons name="ellipsis-horizontal" size={22} color={T.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <View>
            <View style={S.head}>
              <View style={S.bigAv}><Text style={S.bigAvT}>{(u.name || '?')[0].toUpperCase()}</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={S.nm}>{u.name}</Text>
                {u.verified && <Ionicons name="checkmark-circle" size={16} color={T.accent} />}
              </View>
              <Text style={S.hd}>{u.handle}</Text>
              {u.bio ? <Text style={S.bio}>{u.bio}</Text> : null}
              <View style={S.stats}>
                <View style={S.stat}><Text style={S.num}>{u.followers || 0}</Text><Text style={S.lbl}>Followers</Text></View>
                <View style={S.div} />
                <View style={S.stat}><Text style={S.num}>{u.following || 0}</Text><Text style={S.lbl}>Following</Text></View>
                <View style={S.div} />
                <View style={S.stat}><Text style={S.num}>{posts.length}</Text><Text style={S.lbl}>Posts</Text></View>
              </View>

              {!isSelf && (
                <View style={S.actions}>
                  <TouchableOpacity style={[S.btn, isFollowing ? S.btnGhost : S.btnPrimary]} onPress={() => toggleFollow(userId)}>
                    <Ionicons name={isFollowing ? 'checkmark' : 'person-add'} size={16} color={isFollowing ? T.text : '#000'} />
                    <Text style={[S.btnT, isFollowing && { color: T.text }]}>{isFollowing ? 'Following' : 'Follow'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.btn, S.btnGhost]} onPress={message}>
                    <Ionicons name="mail-outline" size={16} color={T.text} />
                    <Text style={S.btnT}>Message</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text style={S.sectionLabel}>Posts</Text>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
        ListEmptyComponent={<Text style={S.empty}>No posts yet.</Text>}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  head: { padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.divider },
  bigAv: { width: 88, height: 88, borderRadius: 44, backgroundColor: T.surface, borderWidth: 2, borderColor: T.accent, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  bigAvT: { color: T.accent, fontSize: 32, fontWeight: '900' },
  nm: { color: T.text, fontSize: 20, fontWeight: '900' },
  hd: { color: T.muted, fontSize: 13, marginTop: 2 },
  bio: { color: T.subText, fontSize: 13, marginTop: 10, textAlign: 'center' },
  stats: { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  stat: { alignItems: 'center', paddingHorizontal: 20 },
  num: { color: T.accent, fontSize: 18, fontWeight: '800' },
  lbl: { color: T.muted, fontSize: 11, marginTop: 2 },
  div: { width: 1, height: 20, backgroundColor: T.divider },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22 },
  btnPrimary: { backgroundColor: T.accent },
  btnGhost: { borderWidth: 1, borderColor: T.border },
  btnT: { color: '#000', fontWeight: '700', fontSize: 13 },
  sectionLabel: { color: T.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, padding: 16 },
  empty: { color: T.muted, textAlign: 'center', padding: 40 }
});
