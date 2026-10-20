/**
 * How the hostel office works — a real screen, not a placeholder.
 *
 * The old profile had a "Help & Support" row that navigated nowhere. A help screen that does not
 * exist is worse than no row at all, because the person reading it believes there is an answer
 * somewhere and stops looking for one.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard } from '../../../../components/ui';

const SECTIONS = [
  {
    key: 'complaints',
    icon: 'chatbubble-ellipses-outline',
    color: '#7c3aed',
    title: 'Complaints',
    body:
      'Report a problem in your room or the mess from My Complaints. It goes to the warden, who assigns it to the right trade — plumbing, electrical, the mess steward or the security officer. You will see who it is with, and you can rate the fix when it is done. A low rating puts it back on the list rather than closing it.',
  },
  {
    key: 'notifications',
    icon: 'notifications-outline',
    color: '#0284c7',
    title: 'Notifications',
    body:
      'Eight kinds: hostel announcements, maintenance alerts, emergencies, gate-pass approvals, late-return alerts, visitor alerts, complaint updates and mess announcements. You can turn any of them off from your profile — except emergencies, which always come through.',
  },
  {
    key: 'gate',
    icon: 'exit-outline',
    color: '#2563eb',
    title: 'Gate passes and visitors',
    body:
      'Request an outpass before you leave, and register a visitor before they arrive. A visitor is confirmed at the gate; an unconfirmed visitor is not admitted.',
  },
  {
    key: 'mess',
    icon: 'restaurant-outline',
    color: '#db2777',
    title: 'Mess',
    body:
      "The day's menu and a rating for each meal. The roll is taken by mess staff, not by you — the kitchen provisions against what it actually served.",
  },
  {
    key: 'profile',
    icon: 'person-outline',
    color: '#d97706',
    title: 'Your profile',
    body:
      'Which blocks you are responsible for, what your role allows, which notifications you have turned off, and every device signed in to your account.',
  },
];

export default function HelpSupport({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Help &amp; support</Text>
      <Text style={styles.sub}>How the hostel office works, and where each thing lives.</Text>

      {SECTIONS.map((s) => (
        <AnimatedCard key={s.key} style={styles.card}>
          <View style={styles.rowLeft}>
            <View style={[styles.icon, { backgroundColor: `${s.color}1a` }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
          </View>
          <Text style={styles.body}>{s.body}</Text>
        </AnimatedCard>
      ))}

      <Text style={styles.foot}>
        Something not covered here? Ask at the hostel office in Block A.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted },
  card: { gap: 6 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  body: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 19 },
  foot: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm },
});
