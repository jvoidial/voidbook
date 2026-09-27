import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { state } = useApp();
  const mine = state.posts.filter(p => p.userId === 'me');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const me = {
    id: user?.id || 'me',
    name: user?.name || 'You',
    handle: user?.handle || '@you',
    bio: user?.bio || 'Living in the void.',
    friends: user?.friends || []
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will be returned to the welcome screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.topBar}>
        <Text style={S.title}>Profile</Text>
        <TouchableOpacity onPress={confirmSignOut} style={S.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={T.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={mine}
        keyExtractor={i => i.id}
        ListHeaderComponent={
          <View style={S.head}>
            <View style={S.bigAv}>
              <Text style={S.bigAvT}>{(me.name[0] || '?').toUpperCase()}</Text>
            </View>
            <Text style={S.nm}>{me.name}</Text>
            <Text style={S.hd}>{me.handle}</Text>
            <Text style={S.bio}>{me.bio}</Text>

            <View style={S.stats}>
              <View style={S.stat}>
                <Text style={S.num}>{mine.length}</Text>
                <Text style={S.lbl}>Posts</Text>
              </View>
              <View style={S.divider} />
              <View style={S.stat}>
                <Text style={S.num}>{me.friends.length}</Text>
                <Text style={S.lbl}>Friends</Text>
              </View>
              <View style={S.divider} />
              <View style={S.stat}>
                <Text style={S.num}>{state.friends.requests.length}</Text>
                <Text style={S.lbl}>Requests</Text>
              </View>
            </View>

            <View style={S.actions}>
              <TouchableOpacity style={S.editBtn}>
                <Ionicons name="create-outline" size={16} color={T.text} />
                <Text style={S.editT}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <Text style={S.sectionLabel}>Your Posts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard post={item} user={usersById[item.userId]} />
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="cube-outline" size={40} color={T.muted} />
            <Text style={S.emptyT}>Nothing posted yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  topBar: { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
            paddingHorizontal:16, paddingVertical:12,
            borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  iconBtn: { padding:6 },
  head: { padding:24, alignItems:'center', borderBottomWidth:1, borderBottomColor:T.border },
  bigAv: { width:96, height:96, borderRadius:48, backgroundColor:T.surface,
           borderWidth:2, borderColor:T.accent, marginBottom:12,
           alignItems:'center', justifyContent:'center' },
  bigAvT: { color:T.accent, fontSize:36, fontWeight:'900' },
  nm: { color:T.text, fontSize:22, fontWeight:'900' },
  hd: { color:T.muted, fontSize:14, marginTop:2 },
  bio: { color:T.text, fontSize:13, marginTop:10, textAlign:'center' },
  stats: { flexDirection:'row', marginTop:24, alignItems:'center' },
  stat: { alignItems:'center', paddingHorizontal:24 },
  num: { color:T.accent, fontSize:20, fontWeight:'800' },
  lbl: { color:T.muted, fontSize:12, marginTop:2 },
  divider: { width:1, height:24, backgroundColor:T.border },
  actions: { flexDirection:'row', marginTop:24 },
  editBtn: { flexDirection:'row', alignItems:'center', gap:6,
             borderWidth:1, borderColor:T.border, borderRadius:20,
             paddingHorizontal:16, paddingVertical:10, backgroundColor:T.surface },
  editT: { color:T.text, fontSize:13, fontWeight:'600' },
  sectionLabel: { color:T.muted, fontSize:11, textTransform:'uppercase',
                  letterSpacing:1, alignSelf:'flex-start', marginTop:24 },
  empty: { padding:48, alignItems:'center', gap:8 },
  emptyT: { color:T.muted, fontSize:13 }
});
