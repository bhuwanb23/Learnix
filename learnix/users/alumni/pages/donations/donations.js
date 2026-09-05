import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';

const stats = [
  { label: 'Collected FY26', value: '₹24.5L', icon: 'cash-outline', color: '#059669' },
  { label: 'Donors', value: '412', icon: 'people-outline', color: '#2563eb' },
  { label: 'Active Campaigns', value: '3', icon: 'flag-outline', color: '#d97706' },
];

const campaigns = [
  {
    id: 'C1',
    name: 'Merit Scholarship Endowment',
    target: 10000000,
    raised: 7400000,
    donors: 186,
    daysLeft: 45,
    color: '#2563eb',
    icon: 'school-outline',
  },
  {
    id: 'C2',
    name: 'Library Modernisation Fund',
    target: 2500000,
    raised: 1850000,
    donors: 92,
    daysLeft: 22,
    color: '#059669',
    icon: 'library-outline',
  },
  {
    id: 'C3',
    name: 'Sports Infrastructure Drive',
    target: 5000000,
    raised: 2900000,
    donors: 134,
    daysLeft: 60,
    color: '#0891b2',
    icon: 'trophy-outline',
  },
];

const donations = [
  { id: 'D1', donor: 'Rohit Malhotra', batch: '2021', amount: 50000, fund: 'Scholarship Endowment', status: 'Received', date: 'Nov 28', color: '#2563eb' },
  { id: 'D2', donor: 'Ananya Joshi', batch: '2023', amount: 15000, fund: 'Library Modernisation', status: 'Received', date: 'Nov 24', color: '#059669' },
  { id: 'D3', donor: 'Arjun Nair', batch: '2019', amount: 100000, fund: 'Sports Infrastructure', status: 'Pending', date: 'Nov 21', color: '#d97706' },
  { id: 'D4', donor: 'Sneha Iyer', batch: '2020', amount: 25000, fund: 'Scholarship Endowment', status: 'Received', date: 'Nov 18', color: '#0891b2' },
];

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${(n / 1000).toFixed(1)}K`;
};

export default function DonationsModule({ navigation }) {
  const [donationsList, setDonationsList] = useState(donations);

  const markReceived = (id) => {
    setDonationsList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'Received' } : d))
    );
    Alert.alert('Donation Recorded', 'Amount forwarded to Accounts & Finance. Receipt auto-generated.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.hero}>
        <Text style={styles.heroLabel}>FY 2025-26 COLLECTIONS</Text>
        <Text style={styles.heroValue}>₹24,50,000</Text>
        <Text style={styles.heroSub}>412 donors · 74% of ₹33L annual target</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: '74%' }]} />
        </View>
        <View style={styles.heroNote}>
          <Ionicons name="arrow-redo-outline" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroNoteText}>All receipts forwarded to Accounts & Finance</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Campaigns</Text>
        {campaigns.map((c) => {
          const pct = Math.round((c.raised / c.target) * 100);
          return (
            <View key={c.id} style={styles.campaignCard}>
              <View style={styles.campaignHeader}>
                <View style={[styles.campaignIcon, { backgroundColor: c.color + '1a' }]}>
                  <Ionicons name={c.icon} size={16} color={c.color} />
                </View>
                <View style={styles.campaignHeaderBody}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  <Text style={styles.campaignMeta}>
                    {c.donors} donors · {c.daysLeft} days left
                  </Text>
                </View>
                <Text style={[styles.campaignPct, { color: c.color }]}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: c.color }]} />
              </View>
              <View style={styles.campaignFooter}>
                <Text style={styles.campaignAmount}>
                  <Text style={styles.campaignRaised}>{fmt(c.raised)}</Text> raised
                </Text>
                <Text style={styles.campaignTarget}>of {fmt(c.target)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: c.color }]}
                onPress={() => Alert.alert('Campaign Shared', `${c.name} link copied — share with alumni batches.`)}
              >
                <Ionicons name="share-social-outline" size={13} color={c.color} />
                <Text style={[styles.shareText, { color: c.color }]}>Share Campaign</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Donations</Text>
        {donationsList.map((d) => (
          <View key={d.id} style={styles.donationCard}>
            <View style={[styles.donorAvatar, { backgroundColor: d.color + '1a' }]}>
              <Text style={[styles.donorInitials, { color: d.color }]}>
                {d.donor.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.donationBody}>
              <Text style={styles.donorName}>{d.donor} · Batch {d.batch}</Text>
              <Text style={styles.donationMeta}>{d.fund} · {d.date}</Text>
            </View>
            <View style={styles.donationRight}>
              <Text style={styles.donationAmount}>₹{d.amount.toLocaleString('en-IN')}</Text>
              {d.status === 'Received' ? (
                <View style={styles.receivedChip}>
                  <Text style={styles.receivedText}>Received</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.recordBtn}
                  onPress={() => markReceived(d.id)}
                >
                  <Text style={styles.recordText}>Record</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  heroValue: {
    fontSize: 26,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 4,
  },
  heroSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  heroProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  heroNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  heroNoteText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  campaignHeaderBody: { flex: 1 },
  campaignName: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  campaignMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  campaignPct: {
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  campaignFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  campaignRaised: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  campaignAmount: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  campaignTarget: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 7,
    marginTop: 10,
  },
  shareText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    marginLeft: 5,
  },
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  donorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  donorInitials: {
    fontSize: 11,
    fontFamily: 'Manrope-ExtraBold',
  },
  donationBody: { flex: 1 },
  donorName: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  donationMeta: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  donationRight: {
    alignItems: 'flex-end',
  },
  donationAmount: {
    fontSize: 13,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  receivedChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  receivedText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  recordBtn: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  recordText: {
    fontSize: 9,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
  },
});