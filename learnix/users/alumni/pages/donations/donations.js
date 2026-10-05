import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { SkeletonCard, SkeletonStatRow, EmptyState } from '../../../../components/ui';
import { CampaignCard } from './components/CampaignCard';
import { DonationRow } from './components/DonationRow';
import { ImpactPanel } from './components/ImpactPanel';
import { inr, inrExact, campaignShareText, relativeDay } from './donationsMeta';

import CampaignDetail from './pages/campaign_detail/campaign_detail';
import GiveScreen from './pages/give/give';
import HistoryScreen from './pages/history/history';
import ReceiptScreen from './pages/receipt/receipt';
import RecurringScreen from './pages/recurring/recurring';

/**
 * Donations & fundraising — the hub.
 *
 * Replaces one 236-line screen that had no give path at all: it listed campaigns,
 * listed donations, and offered the office a "Record" button. An alumnus who
 * wanted to give had no button to press, and a campaign was a name and a
 * percentage with nothing behind it to decide on.
 *
 * Five tabs, because these are five different questions:
 *   Campaigns  what is being raised for?
 *   My giving  what have I done, and do I have receipts?
 *   History    what has everyone done?
 *   Standing   what have I committed to give regularly?
 *   Impact     what did it achieve?
 */
const TABS = [
  { id: 'campaigns', label: 'Campaigns', icon: 'megaphone-outline' },
  { id: 'mine', label: 'My giving', icon: 'heart-outline' },
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'standing', label: 'Standing', icon: 'repeat-outline' },
  { id: 'impact', label: 'Impact', icon: 'analytics-outline' },
];

export default function DonationsModule({ navigation }) {
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState(null);
  const [summary, setSummary] = useState(null);
  const [impact, setImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [recordingId, setRecordingId] = useState(false);

  // Sub-screens, held as local state rather than pushed: this app has no
  // navigation stack, so a drill-down that could not be dismissed would strand the
  // user on it with no way back.
  const [sub, setSub] = useState(null); // { kind, id, campaign }

  const load = useCallback(async (spinner = true) => {
    try {
      if (spinner) setLoading(true);
      setError(null);
      const [c, s] = await Promise.all([alumniApi.campaigns(), alumniApi.donations({ pageSize: 6 })]);
      setCampaigns(c);
      setSummary(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadImpact = useCallback(async () => {
    try {
      setImpactLoading(true);
      setImpact(await alumniApi.donationsImpact());
    } catch {
      setImpact(null);
    } finally {
      setImpactLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab === 'impact') loadImpact();
  }, [tab, loadImpact]);

  const refreshAll = useCallback(() => {
    load(false);
    loadImpact();
  }, [load, loadImpact]);

  const onRecord = async (donation) => {
    // This is the OFFICE's action: a donor tapping "Confirm received" on their own
    // gift would be minting their own tax receipt, so the button is rendered from
    // the server's `canRecord` rather than from the status alone.
    try {
      setRecordingId(donation.id);
      const res = await alumniApi.recordDonation(donation.id);
      Alert.alert(
        'Receipt issued',
        `${inrExact(res.amountRupees)} from ${res.donor}.\nReceipt ${res.receiptNo} is now available to them.`,
      );
      refreshAll();
    } catch (e) {
      Alert.alert('Cannot record', e.message);
    } finally {
      setRecordingId(false);
    }
  };

  const onShareCampaign = async (campaign) => {
    try {
      await Share.share({ message: campaignShareText(campaign) });
    } catch {
      Alert.alert('Cannot share', 'Sharing is not available on this device.');
    }
  };

  // ── Sub-screens ──
  if (sub?.kind === 'campaign') {
    return (
      <CampaignDetail
        campaignId={sub.id}
        navigation={{ goBack: () => setSub(null) }}
        onGive={(c) => setSub({ kind: 'give', campaign: c })}
      />
    );
  }
  if (sub?.kind === 'give') {
    return <GiveScreen navigation={{ goBack: () => setSub(null) }} campaign={sub.campaign} />;
  }
  if (sub?.kind === 'history') {
    return (
      <HistoryScreen
        navigation={{ goBack: () => setSub(null) }}
        recordingId={recordingId}
        onRecord={onRecord}
        onChanged={refreshAll}
        onShowReceipt={(d) => setSub({ kind: 'receipt', id: d.id })}
      />
    );
  }
  if (sub?.kind === 'receipt') {
    return <ReceiptScreen donationId={sub.id} navigation={{ goBack: () => setSub(null) }} />;
  }
  if (sub?.kind === 'standing') {
    return (
      <RecurringScreen
        navigation={{ goBack: () => setSub(null) }}
        onChanged={refreshAll}
        isOffice={!!summary?.viewerContext?.isOffice}
      />
    );
  }

  const fy = summary?.fy ?? { collectedRupees: 0, pledgedRupees: 0, donors: 0 };
  const list = campaigns?.campaigns ?? [];
  const recent = summary?.donations ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>ALUMNI GIVING</Text>
            <Text style={styles.heroValue}>{inr(fy.collectedRupees)}</Text>
            <Text style={styles.heroSub}>
              {fy.donors} donor{fy.donors === 1 ? '' : 's'} · {fy.pledgedRupees > 0 ? `${inr(fy.pledgedRupees)} pledged` : 'nothing outstanding'}
            </Text>
          </View>
        </View>

        {/* The primary action, stated once. */}
        <TouchableOpacity style={styles.heroBtn} onPress={() => setSub({ kind: 'give' })}>
          <Ionicons name="hand-left-outline" size={16} color="#047857" />
          <Text style={styles.heroBtnText}>Make a donation</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.quickRow}>
        <QuickBtn icon="repeat-outline" label="Standing gifts" onPress={() => setSub({ kind: 'standing' })} />
        <QuickBtn icon="receipt-outline" label="History & receipts" onPress={() => setSub({ kind: 'history' })} />
        <QuickBtn icon="analytics-outline" label="Impact" onPress={() => setTab('impact')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabWrap} contentContainerStyle={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.tabActive]} onPress={() => setTab(t.id)}>
            <Ionicons name={t.icon} size={13} color={tab === t.id ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !campaigns ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonStatRow count={3} />
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refreshAll(); }} />}
        >
          {tab === 'campaigns' ? (
            <>
              {list.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={c}
                  onOpen={() => setSub({ kind: 'campaign', id: c.id })}
                  onGive={() => setSub({ kind: 'give', campaign: c })}
                />
              ))}
              {list.length === 0 ? (
                <EmptyState
                  icon="megaphone-outline"
                  title="No open campaigns"
                  subtitle="When the Alumni Relations Office opens an appeal it appears here with its target and progress."
                  actionLabel="Give to the general fund"
                  onAction={() => setSub({ kind: 'give' })}
                  color="#059669"
                />
              ) : null}
            </>
          ) : null}

          {tab === 'mine' ? (
            <>
              <ImpactPanel impact={impact} loading={impactLoading} onGive={() => setSub({ kind: 'give' })} onOpenCampaign={(id) => setSub({ kind: 'campaign', id })} />

              <Text style={styles.sectionTitle}>My recent gifts</Text>
              {recent.length === 0 ? (
                <Text style={styles.note}>Your gifts appear here once you give.</Text>
              ) : (
                recent.map((d) => (
                  <DonationRow
                    key={d.id}
                    donation={d}
                    onShowReceipt={d.hasReceipt ? () => setSub({ kind: 'receipt', id: d.id }) : undefined}
                  />
                ))
              )}
            </>
          ) : null}

          {tab === 'history' ? (
            <>
              <Text style={styles.sectionTitle}>Programme-wide ledger</Text>
              {recent.map((d) => (
                <DonationRow key={d.id} donation={d} onShowReceipt={d.hasReceipt ? () => setSub({ kind: 'receipt', id: d.id }) : undefined} />
              ))}
              {recent.length === 0 ? (
                <EmptyState icon="receipt-outline" title="No gifts recorded yet" subtitle="Confirmed gifts appear here with a receipt." color="#059669" />
              ) : null}
              <TouchableOpacity style={styles.moreBtn} onPress={() => setSub({ kind: 'history' })}>
                <Text style={styles.moreText}>Open full history with filters</Text>
                <Ionicons name="chevron-forward" size={14} color="#059669" />
              </TouchableOpacity>
            </>
          ) : null}

          {tab === 'standing' ? (
            <>
              <Text style={styles.sectionTitle}>Standing gifts</Text>
              <Text style={styles.note}>
                A standing gift records an intention to give regularly. Nothing is charged automatically — the office
                creates each instalment when it falls due, then confirms the money before a receipt is issued.
              </Text>
              <TouchableOpacity style={styles.ctaBtn} onPress={() => setSub({ kind: 'standing' })}>
                <Ionicons name="repeat" size={15} color="#fff" />
                <Text style={styles.ctaText}>Manage standing gifts</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {tab === 'impact' ? <ImpactPanel impact={impact} loading={impactLoading} onGive={() => setSub({ kind: 'give' })} onOpenCampaign={(id) => setSub({ kind: 'campaign', id })} /> : null}

          {tab === 'campaigns' && list.length > 0 ? (
            <TouchableOpacity style={styles.shareAllBtn} onPress={() => onShareCampaign(list[0])}>
              <Ionicons name="share-social-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.shareAllText}>Share the top appeal with your batch</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function QuickBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress}>
      <Ionicons name={icon} size={15} color="#059669" />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#059669', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },

  hero: { padding: 18, paddingTop: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.5 },
  heroValue: { fontSize: 25, fontFamily: 'Manrope-ExtraBold', color: '#fff', marginTop: 5 },
  heroSub: { fontSize: 10, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11, marginTop: 13 },
  heroBtnText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#047857' },

  quickRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingTop: 12 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4 },
  quickText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.text, textAlign: 'center' },

  tabWrap: { flexGrow: 0, marginTop: 11 },
  tabRow: { paddingHorizontal: 16, gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 11, paddingVertical: 7 },
  tabActive: { backgroundColor: '#059669', borderColor: '#059669' },
  tabText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  tabTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 28 },
  sectionTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginTop: 14, marginBottom: 9 },
  note: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 16, marginBottom: 10 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 11, paddingVertical: 10, marginTop: 4 },
  moreText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#059669' },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 13, marginTop: 6 },
  ctaText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  shareAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 6 },
  shareAllText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
});
