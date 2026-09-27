import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { theme as T } from '../theme';

export default function GroupsScreen() {
  const { state, toggleGroup } = useApp();
  return (
    <SafeAreaView style={S.c} edges={['top']}>
      <View style={S.top}><Text style={S.title}>Groups</Text></View>
      <FlatList data={state.groups} keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.gAv}><Ionicons name="people" size={26} color={T.accent} /></View>
            <View style={{ flex:1 }}>
              <Text style={S.nm}>{item.name}</Text>
              <Text style={S.hd}>{item.members.toLocaleString()} members</Text>
              <Text style={S.desc} numberOfLines={2}>{item.desc}</Text>
            </View>
            <TouchableOpacity style={item.joined ? S.leave : S.join}
              onPress={() => toggleGroup(item.id)}>
              <Text style={item.joined ? S.leaveT : S.joinT}>
                {item.joined ? 'Leave' : 'Join'}
              </Text>
            </TouchableOpacity>
          </View>
        )} />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  c: { flex:1, backgroundColor:T.bg },
  top: { padding:16, borderBottomWidth:1, borderBottomColor:T.border },
  title: { color:T.text, fontSize:20, fontWeight:'800' },
  card: { flexDirection:'row', alignItems:'center', padding:16,
          borderBottomWidth:1, borderBottomColor:T.border },
  gAv: { width:56, height:56, borderRadius:14, backgroundColor:T.surface,
         borderWidth:1, borderColor:T.border, marginRight:12,
         alignItems:'center', justifyContent:'center' },
  nm: { color:T.text, fontWeight:'bold' },
  hd: { color:T.muted, fontSize:12 },
  desc: { color:T.muted, fontSize:12, marginTop:4 },
  join: { backgroundColor:T.accent, paddingHorizontal:14, paddingVertical:8, borderRadius:16 },
  joinT: { color:'#000', fontWeight:'bold', fontSize:12 },
  leave: { backgroundColor:T.surface, paddingHorizontal:14, paddingVertical:8,
           borderRadius:16, borderWidth:1, borderColor:T.border },
  leaveT: { color:T.text, fontSize:12 }
});
