import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { theme as T } from '../theme';

export default function FeedScreen() {
  const nav = useNavigation();
  const { state, addPost } = useApp();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const submit = () => {
    if (!text.trim()) return;
    addPost(text);
    setText('');
    setComposerOpen(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      {/* Facebook-style top bar */}
      <View style={S.topBar}>
        <Text style={S.logo}>VOID<Text style={{ color: T.accent }}>BOOK</Text></Text>
        <View style={S.topActions}>
          <TouchableOpacity style={S.topBtn} onPress={() => nav.navigate('Search')}>
            <Ionicons name="search" size={20} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={S.topBtn} onPress={() => nav.navigate('Messages')}>
            <Ionicons name="chatbubbles-outline" size={20} color={T.text} />
          </TouchableOpacity>
          <TouchableOpacity style={S.topBtn} onPress={() => nav.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color={T.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={state.posts}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
        ListHeaderComponent={
          <>
            {/* Stories row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.storiesRow}>
              <TouchableOpacity style={S.storyAdd} onPress={() => Alert.alert('Create story', 'Camera coming soon')}>
                <View style={S.storyAddImg}>
                  <Ionicons name="add" size={28} color={T.accent} />
                </View>
                <Text style={S.storyLbl}>Create</Text>
              </TouchableOpacity>
              {state.stories.map(s => {
                const u = usersById[s.userId];
                return (
                  <TouchableOpacity key={s.id} style={S.story}>
                    <View style={S.storyAv}><Text style={S.storyAvT}>{u?.name?.[0]}</Text></View>
                    <Text style={S.storyLbl} numberOfLines={1}>{u?.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Composer trigger (Facebook-style) */}
            <View style={S.composerTrigger}>
              <View style={S.myAv}><Text style={S.myAvT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
              <TouchableOpacity style={S.composerField} onPress={() => setComposerOpen(true)}>
                <Text style={S.composerPH}>What's on your mind?</Text>
              </TouchableOpacity>
            </View>

            <View style={S.quickRow}>
              <TouchableOpacity style={S.quick} onPress={() => setComposerOpen(true)}>
                <Ionicons name="images-outline" size={18} color={T.success} />
                <Text style={S.quickT}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.quick} onPress={() => setComposerOpen(true)}>
                <Ionicons name="videocam-outline" size={18} color={T.danger} />
                <Text style={S.quickT}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.quick} onPress={() => nav.navigate('Watch')}>
                <Ionicons name="radio-outline" size={18} color={T.accent} />
                <Text style={S.quickT}>Live</Text>
              </TouchableOpacity>
            </View>

            {/* Full composer (shown when open) */}
            {composerOpen && (
              <View style={S.composer}>
                <TextInput
                  style={S.composerInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor={T.muted}
                  multiline
                  autoFocus
                  value={text}
                  onChangeText={setText}
                />
                <View style={S.composerBar}>
                  <View style={S.composerIcons}>
                    <Ionicons name="image-outline" size={22} color={T.success} />
                    <Ionicons name="videocam-outline" size={22} color={T.danger} />
                    <Ionicons name="location-outline" size={22} color={T.accent} />
                  </View>
                  <TouchableOpacity
                    style={[S.postBtn, !text.trim() && { opacity: 0.4 }]}
                    disabled={!text.trim()}
                    onPress={submit}
                  >
                    <Text style={S.postBtnT}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 16, paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: T.divider },
  logo: { color: T.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  topActions: { flexDirection: 'row', gap: 8 },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
            alignItems: 'center', justifyContent: 'center' },

  storiesRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  story: { width: 100, height: 160, borderRadius: 14, backgroundColor: T.surface,
           borderWidth: 1, borderColor: T.border, alignItems: 'center', paddingTop: 12 },
  storyAdd: { width: 100, height: 160, borderRadius: 14, backgroundColor: T.surface,
              borderWidth: 1, borderColor: T.border, alignItems: 'center', paddingTop: 12 },
  storyAddImg: { width: 60, height: 100, borderRadius: 10, backgroundColor: T.elevated,
                 alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  storyAv: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.elevated,
             borderWidth: 2.5, borderColor: T.accent, alignItems: 'center',
             justifyContent: 'center', marginBottom: 8 },
  storyAvT: { color: T.accent, fontWeight: '900', fontSize: 20 },
  storyLbl: { color: T.text, fontSize: 12, fontWeight: '600' },

  composerTrigger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                     paddingVertical: 12, gap: 10 },
  myAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface,
          borderWidth: 1.5, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  myAvT: { color: T.accent, fontWeight: '900', fontSize: 15 },
  composerField: { flex: 1, height: 42, borderRadius: 21, backgroundColor: T.surface,
                   borderWidth: 1, borderColor: T.border, justifyContent: 'center', paddingHorizontal: 16 },
  composerPH: { color: T.muted, fontSize: 15 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-around',
              paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.divider,
              borderBottomWidth: 1, borderBottomColor: T.divider },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12 },
  quickT: { color: T.subText, fontSize: 13, fontWeight: '600' },

  composer: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  composerInput: { color: T.text, fontSize: 17, minHeight: 80, textAlignVertical: 'top' },
  composerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  composerIcons: { flexDirection: 'row', gap: 20 },
  postBtn: { backgroundColor: T.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 22 },
  postBtnT: { color: '#000', fontWeight: '800', fontSize: 14 }
});
