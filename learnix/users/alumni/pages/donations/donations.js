import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${(n / 1000).toFixed(1)}K`;
};

const CAMPAIGN_COLORS = ['#2563eb', '#059669', '#0891b2', '#d97706', '#dc2626', '#7c3aed'];
const CAMPAIGN_ICONS = ['school-outline', 'library-outline', 'trophy-outline', 'heart-outline', 'build-outline', 'flag-outline'];
const DONOR_COLORS = ['#2563eb', '#059669', '#d97706', '#0891b2', '#dc2626', '#7c3aed'];

export default function DonationsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recordingId, setRecordingId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await alumniApi.donations();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const markReceived = async (id) => {
    setRecordingId(id);
    try {
      const res = await alumniApi.recordDonation(id);
      Alert.alert(
        'Donation Recorded',
        `₹${res.amountRupees.toLocaleString('en-IN')} received from ${res.donor}.\nReceipt ${res.receiptNo} forwarded to Accounts & Finance.`
      );
      await load(false);
    } catch (e) {
      Alert.alert('Cannot record', e.message);
    } finally {
      setRecordingId(null);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const campaigns = data?.campaigns ?? [];
  const donationsList = data?.donations ?? [];
  const fy = data?.fy ?? { collectedRupees: 0, donors: 0 };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#059669', '#047857']} style={styles.hero}>
        <Text style={styles.heroLabel}>FY 2025-26 COLLECTIONS</Text>
        <Text style={styles.heroValue}>₹{fy.collectedRupees.toLocaleString('en-IN')}</Text>
        <Text style={styles.heroSub}>{fy.donors} donor{fy.donors === 1 ? '' : 's'} · recorded this year</Text>
        <View style={styles.heroNote}>
          <Ionicons name="arrow-redo-outline" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroNoteText}>All receipts forwarded to Accounts & Finance</Text>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Campaigns</Text>
        {campaigns.map((c, idx) => {
          const color = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
          const icon = CAMPAIGN_ICONS[idx % CAMPAIGN_ICONS.length];
          return (
            <View key={c.id} style={styles.campaignCard}>
              <View style={styles.campaignHeader}>
                <View style={[styles.campaignIcon, { backgroundColor: color + '1a' }]}>
                  <Ionicons name={icon} size={16} color={color} />
                </View>
                <View style={styles.campaignHeaderBody}>
                  <Text style={styles.campaignName}>{c.name}</Text>
                  <Text style={styles.campaignMeta}>
                    {c.daysLeft !== null ? `${c.daysLeft} days left` : 'No deadline'} · {c.status}
                  </Text>
                </View>
                <Text style={[styles.campaignPct, { color }]}>{c.percent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(c.percent, 100)}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.campaignFooter}>
                <Text style={styles.campaignAmount}>
                  <Text style={styles.campaignRaised}>{fmt(c.raisedRupees)}</Text> raised
                </Text>
                <Text style={styles.campaignTarget}>of {fmt(c.targetRupees)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: color }]}
                onPress={() => Alert.alert('Campaign Shared', `${c.name} link copied — share with alumni batches.`)}
              >
                <Ionicons name="share-social-outline" size={13} color={color} />
                <Text style={[styles.shareText, { color }]}>Share Campaign</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {campaigns.length === 0 && <Text style={styles.emptyText}>No active campaigns.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Donations</Text>
        {donationsList.map((d, idx) => {
          const color = DONOR_COLORS[idx % DONOR_COLORS.length];
          const dateStr = new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          return (
            <View key={d.id} style={styles.donationCard}>
              <View style={[styles.donorAvatar, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.donorInitials, { color }]}>
                  {d.donor.split(' ').map((n) => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.donationBody}>
                <Text style={styles.donorName}>{d.donor}{d.batch ? ` · Batch ${d.batch}` : ''}</Text>
                <Text style={styles.donationMeta}>{d.fund} · {dateStr}</Text>
              </View>
              <View style={styles.donationRight}>
                <Text style={styles.donationAmount}>₹{d.amountRupees.toLocaleString('en-IN')}</Text>
                {d.status === 'RECEIVED' ? (
                  <View style={styles.receivedChip}>
                    <Text style={styles.receivedText}>Received</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.recordBtn}
                    disabled={recordingId === d.id}
                    onPress={() => markReceived(d.id)}
                  >
                    {recordingId === d.id ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <Text style={styles.recordText}>Record</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        {donationsList.length === 0 && <Text style={styles.emptyText}>No donations yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, paddingVertical: 12 },
  hero: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18 },
  heroLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  heroValue: { fontSize: 24, fontFamily: 'Manrope-ExtraBold', color: '#fff', marginTop: 6 },
  heroSub: { fontSize: 11, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroNote: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  heroNoteText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.9)', marginLeft: 5 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 12 },
  campaignCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
  campaignHeader: { flexDirection: 'row', alignItems: 'center' },
  campaignIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  campaignHeaderBody: { flex: 1, marginLeft: 10 },
  campaignName: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  campaignMeta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  campaignPct: { fontSize: 14, fontFamily: 'Manrope-ExtraBold' },
  progressTrack: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, marginTop: 10 },
  progressFill: { height: 6, borderRadius: 3 },
  campaignFooter: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  campaignAmount: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  campaignRaised: { fontSize: 13, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  campaignTarget: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginLeft: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 9, paddingVertical: 7, marginTop: 12 },
  shareText: { fontSize: 11, fontFamily: 'Manrope-Bold', marginLeft: 5 },
  donationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginBottom: 8 },
  donorAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  donorInitials: { fontSize: 12, fontFamily: 'Manrope-Bold' },
  donationBody: { flex: 1, marginLeft: 10 },
  donorName: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  donationMeta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  donationRight: { alignItems: 'flex-end' },
  donationAmount: { fontSize: 12, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  receivedChip: { backgroundColor: '#05966918', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  receivedText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#059669' },
  recordBtn: { backgroundColor: '#059669', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  recordText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: '#fff' },
});
