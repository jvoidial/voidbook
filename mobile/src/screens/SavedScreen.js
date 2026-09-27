import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function SavedScreen({ navigation }) {
  const { state } = useApp();
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));
  const saved = state.posts.filter(p => state.bookmarks.includes(p.id));

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={T.text} />
        </TouchableOpacity>
        <Text style={S.title}>Saved</Text>
        <View style={{ width: 26 }} />
      </View>
      <FlatList
        data={saved}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
        ListEmptyComponent={
          <View style={S.empty}>
            <Ionicons name="bookmark-outline" size={40} color={T.muted} />
            <Text style={S.emptyT}>No saved posts yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  title: { color: T.text, fontSize: 18, fontWeight: '800' },
  empty: { padding: 60, alignItems: 'center', gap: 12 },
  emptyT: { color: T.muted, fontSize: 14 }
});
