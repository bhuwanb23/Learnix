import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const toggles = [
  { id: 'T1', label: 'Event invites & RSVP alerts', icon: 'calendar-outline', color: '#2563eb', default: true },
  { id: 'T2', label: 'Donation appeal notifications', icon: 'gift-outline', color: '#059669', default: true },
  { id: 'T3', label: 'Chapter news & meetups', icon: 'location-outline', color: '#d97706', default: false },
  { id: 'T4', label: 'Mentorship session reminders', icon: 'hand-left-outline', color: '#0891b2', default: true },
];

const menuItems = [
  { id: 'M1', label: 'Newsletter Archive', icon: 'mail-outline' },
  { id: 'M2', label: 'Alumni Badge & Certificates', icon: 'ribbon-outline' },
  { id: 'M3', label: 'Help & Support', icon: 'help-circle-outline' },
  { id: 'M4', label: 'About Learnix', icon: 'information-circle-outline' },
];

export default function AlumniProfile({ navigation }) {
  const [prefs, setPrefs] = useState(
    toggles.reduce((acc, t) => ({ ...acc, [t.id]: t.default }), {})
  );

  const togglePref = (id) => {
    setPrefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AR</Text>
        </View>
        <Text style={styles.name}>Priya Krishnan</Text>
        <Text style={styles.role}>Director, Alumni Relations</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="ribbon-outline" size={11} color="#fff" />
            <Text style={styles.badgeText}>8 yrs at Learnix</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="school-outline" size={11} color="#fff" />
            <Text style={styles.badgeText}>Batch 2016</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12,450</Text>
          <Text style={styles.statLabel}>Alumni</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>14</Text>
          <Text style={styles.statLabel}>Chapters</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹24.5L</Text>
          <Text style={styles.statLabel}>FY Donations</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.prefCard}>
          {toggles.map((t, idx) => (
            <View
              key={t.id}
              style={[styles.prefRow, idx < toggles.length - 1 && styles.prefRowBorder]}
            >
              <View style={[styles.prefIcon, { backgroundColor: t.color + '1a' }]}>
                <Ionicons name={t.icon} size={15} color={t.color} />
              </View>
              <Text style={styles.prefLabel}>{t.label}</Text>
              <TouchableOpacity
                style={[styles.switch, prefs[t.id] && styles.switchOn]}
                onPress={() => togglePref(t.id)}
              >
                <View style={[styles.switchKnob, prefs[t.id] && styles.switchKnobOn]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {menuItems.map((m, idx) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.menuRow, idx < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={() => Alert.alert(m.label, 'Coming soon')}
              activeOpacity={0.7}
            >
              <Ionicons name={m.icon} size={17} color={theme.colors.textMuted} />
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => Alert.alert('Logout', 'You will be returned to the login screen.')}
      >
        <Ionicons name="log-out-outline" size={16} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  name: {
    fontSize: 19,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  role: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  prefCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  prefRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prefLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  switch: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    padding: 3,
  },
  switchOn: {
    backgroundColor: '#2563eb',
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  switchKnobOn: {
    alignSelf: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginLeft: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 13,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 6,
  },
});