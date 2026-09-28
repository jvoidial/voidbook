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
  const [activeTab, setActiveTab] = useState('For you');
  const usersById = Object.fromEntries(state.users.map(u => [u.id, u]));

  const submit = () => {
    if (!text.trim()) return;
    addPost(text);
    setText('');
  };

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.topBar}>
        <Text style={S.logo}>VOID<Text style={{ color: T.accent }}>BOOK</Text></Text>
        <TouchableOpacity style={S.profileBtn} onPress={() => nav.navigate('Profile')}>
          <View style={S.profileAv}><Text style={S.profileAvT}>{(user?.name || '?')[0]}</Text></View>
        </TouchableOpacity>
      </View>

      {/* X-Style Tabs */}
      <View style={S.tabs}>
        {['For you', 'Following'].map(t => (
          <TouchableOpacity key={t} style={[S.tab, activeTab === t && S.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[S.tabT, activeTab === t && S.tabTActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={state.posts}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
        ListHeaderComponent={
          <View style={S.composer}>
            <View style={S.myAv}><Text style={S.myAvT}>{(user?.name || '?')[0]?.toUpperCase()}</Text></View>
            <TextInput style={S.input} placeholder="What is happening?!" placeholderTextColor={T.muted} multiline value={text} onChangeText={setText} />
            {text.length > 0 && (
              <TouchableOpacity style={S.postBtn} onPress={submit}>
                <Text style={S.postBtnT}>Post</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} user={usersById[item.userId]} />}
      />

      <TouchableOpacity style={S.fab} onPress={() => {}}>
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex: 1, backgroundColor: T.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  logo: { color: T.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  profileBtn: { padding: 4 },
  profileAv: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  profileAvT: { color: T.accent, fontWeight: '900', fontSize: 14 },
  
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.divider },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.accent },
  tabT: { color: T.muted, fontWeight: '600', fontSize: 14 },
  tabTActive: { color: T.text },
  
  composer: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: T.divider },
  myAv: { width: 40, height: 40, borderRadius: 20, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  myAvT: { color: T.accent, fontWeight: '900', fontSize: 15 },
  input: { flex: 1, color: T.text, fontSize: 16, minHeight: 40, textAlignVertical: 'top' },
  postBtn: { backgroundColor: T.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  postBtnT: { color: '#000', fontWeight: '800', fontSize: 13 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 }
});
