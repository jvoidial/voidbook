import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme as T } from '../theme';

const PERKS = [
  ['checkmark-circle', 'Blue checkmark', 'A verified badge on your profile and every post.'],
  ['flash-outline', 'Priority reach', 'Your posts are ranked ahead of the rest.'],
  ['sparkles-outline', 'Early access', 'Try new sqawk features before anyone else.'],
  ['heart-outline', 'Support sqawk', 'You keep an independent, ad-free timeline alive.']
];

export default function PremiumModal({ visible, onClose }) {
  const subscribe = () => Alert.alert(
    'sqawk Premium',
    'Payment integration coming soon.\n\nTo test now, run the SQL to set is_premium = true.'
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.bg}>
        <View style={S.sheet}>
          <View style={S.head}>
            <View style={S.badge}>
              <Ionicons name="checkmark-circle" size={26} color={T.link} />
            </View>
            <TouchableOpacity onPress={onClose} style={S.close}>
              <Ionicons name="close" size={22} color={T.text} />
            </TouchableOpacity>
          </View>

          <Text style={S.title}>sqawk Premium</Text>
          <Text style={S.price}>
            $8<Text style={S.per}> / month</Text>
          </Text>
          <Text style={S.blurb}>Get verified and stand out in the void.</Text>

          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {PERKS.map(([icon, title, body]) => (
              <View key={title} style={S.perk}>
                <Ionicons name={icon} size={20} color={T.text} style={S.perkIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={S.perkT}>{title}</Text>
                  <Text style={S.perkB}>{body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={S.cta} onPress={subscribe}>
            <Text style={S.ctaT}>Subscribe — $8/month</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.later} onPress={onClose}>
            <Text style={S.laterT}>Maybe later</Text>
          </TouchableOpacity>
          <Text style={S.legal}>Cancel any time. Billed monthly through the app store.</Text>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
           padding: 24, borderTopWidth: 1, borderColor: T.border },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.linkDim,
           alignItems: 'center', justifyContent: 'center' },
  close: { padding: 4 },
  title: { color: T.text, fontSize: 26, fontWeight: '900', marginTop: 16 },
  price: { color: T.text, fontSize: 34, fontWeight: '900', marginTop: 4 },
  per: { color: T.muted, fontSize: 15, fontWeight: '600' },
  blurb: { color: T.subText, fontSize: 14, marginTop: 6, marginBottom: 20 },
  perk: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  perkIcon: { marginRight: 12, marginTop: 1 },
  perkT: { color: T.text, fontSize: 15, fontWeight: '700' },
  perkB: { color: T.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  cta: { backgroundColor: T.accent, paddingVertical: 16, borderRadius: 30,
         alignItems: 'center', marginTop: 8 },
  ctaT: { color: '#000', fontWeight: '800', fontSize: 16 },
  later: { alignItems: 'center', paddingVertical: 14 },
  laterT: { color: T.muted, fontSize: 14, fontWeight: '600' },
  legal: { color: T.muted, fontSize: 11, textAlign: 'center', marginTop: 2 }
});
