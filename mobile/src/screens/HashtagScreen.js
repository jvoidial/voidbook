import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function HashtagScreen({ route, navigation }) {
  const { tag } = route.params;
  const { state } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const posts = state.posts.filter(p => (p.content || '').toLowerCase().includes(tag.toLowerCase()));

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={S.title}>{tag}</Text>
        <View style={{ width: 26 }} />
      </View>
      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
        ListEmptyComponent={<Text style={S.empty}>No posts with {tag} yet.</Text>}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  title: { color: T.accent, fontSize: 18, fontWeight: '800' },
  empty: { color: T.muted, textAlign: 'center', padding: 40 }
});
