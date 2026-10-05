import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { SkeletonCard, EmptyState } from '../../../../../../components/ui';
import { GiftRow } from '../../components/DonationRow';
import { inr, inrExact, barPercent, campaignStatusMeta, deadlineLabel, fmtDate, lookup, CAMPAIGN_CATEGORIES } from '../../donationsMeta';

/**
 * One campaign — the "cause detail" a donor needs before deciding.
 *
 * What is here and why it is here: what the money is FOR (beneficiary), how it is
 * going (progress, donor count, pledges still outstanding), who gave recently
 * (with anonymity honoured), and what the viewer has already done about it
 * (myContributionRupees — null, not 0, for a non-donor).
 */
export default function CampaignDetail({ campaignId, navigation, onGive }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (spinner = true) => {
      try {
        if (spinner) setLoading(true);
        setError(null);
        setData(await alumniApi.campaign(campaignId));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onShare = async () => {
    const { campaignShareText } = require('../../donationsMeta');
    try {
      // The real OS share sheet. The old screen fired an alert that said "link
      // copied" and copied nothing at all.
      await Share.share({ message: campaignShareText(data) });
    } catch {
      Alert.alert('Cannot share', 'Sharing is not available on this device.');
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error ?? 'Campaign not found'}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const meta = campaignStatusMeta(data);
  const category = lookup(CAMPAIGN_CATEGORIES, data.category);
  const pledges = Math.max(0, data.pledgeCount - data.giftCount);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} onShare={onShare} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
      >
        <View style={[styles.hero, { borderColor: meta.color + '55' }]}>
          <View style={styles.heroTop}>
            <View style={[styles.icon, { backgroundColor: meta.color + '18' }]}>
              <Ionicons name={category.icon} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 11 }}>
              <Text style={styles.name}>{data.name}</Text>
              <Text style={styles.category}>{category.label}</Text>
            </View>
          </View>

          {data.beneficiary ? (
            <View style={styles.benefitBox}>
              <Ionicons name="information-circle" size={13} color={meta.color} />
              <Text style={styles.benefit}>{data.beneficiary}</Text>
            </View>
          ) : null}

          {data.description ? <Text style={styles.desc}>{data.description}</Text> : null}

          <View style={styles.progressTop}>
            <Text style={[styles.percent, { color: meta.color }]}>{data.percent}%</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.raised}>{inr(data.raisedRupees)}</Text>
              <Text style={styles.target}>of {inr(data.targetRupees)}</Text>
            </View>
          </View>

          {/* The bar clamps; the number above it does not. */}
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${barPercent(data.percent)}%`, backgroundColor: meta.color }]} />
          </View>

          <View style={styles.heroFoot}>
            <Text style={styles.heroMeta}>
              {meta.label} · {deadlineLabel(data)}
            </Text>
            {data.met ? (
              <Text style={styles.heroMeta}>Fully funded</Text>
            ) : (
              <Text style={styles.heroMeta}>{inr(data.remainingRupees)} still needed</Text>
            )}
          </View>
        </View>

        <View style={styles.facts}>
          <FactCell value={String(data.donorCount)} label="donors" />
          <FactCell value={String(data.giftCount)} label="gifts received" />
          <FactCell value={String(pledges)} label="pledged, pending" />
        </View>

        {/* Null, not zero: "I have given nothing here" and "this campaign has
            received nothing" are different statements. */}
        {data.myContributionRupees !== null ? (
          <View style={styles.mineBox}>
            <Ionicons name="heart-circle" size={16} color="#059669" />
            <View style={{ flex: 1, marginLeft: 9 }}>
              <Text style={styles.mineTitle}>You have given {inrExact(data.myContributionRupees)} to this cause</Text>
              <Text style={styles.mineHint}>Thank you. Receipts are in your donation history.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          {data.viewerContext.canGive ? (
            <TouchableOpacity style={styles.giveBtn} onPress={() => onGive?.(data)}>
              <Ionicons name="hand-left-outline" size={15} color="#fff" />
              <Text style={styles.giveText}>Donate to this cause</Text>
            </TouchableOpacity>
          ) : (
            // A closed appeal still explains itself rather than simply lacking a button.
            <View style={styles.closedBox}>
              <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.closedText}>
                {data.met
                  ? 'This campaign has met its target. Gifts are still recorded against it for the record.'
                  : `This appeal closed${data.deadline ? ` on ${fmtDate(data.deadline)}` : ''} and is no longer accepting donations.`}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Recent gifts</Text>
        {data.recentGifts.map((g) => (
          <GiftRow key={g.id} gift={g} />
        ))}
        {data.recentGifts.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No gifts recorded yet"
            subtitle="This appeal is open and has not received a confirmed gift. A pledge will appear once the office confirms it."
            color={meta.color}
          />
        ) : null}

        {data.giftCount > data.recentGifts.length ? (
          <Text style={styles.moreNote}>
            Showing the {data.recentGifts.length} most recent of {data.giftCount} gifts.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Header({ navigation, onShare }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
        <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      {onShare ? (
        <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
          <Ionicons name="share-social-outline" size={17} color={theme.colors.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function FactCell({ value, label }) {
  return (
    <View style={styles.factCell}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { marginTop: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#059669', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  shareBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  list: { padding: 16, paddingBottom: 28 },

  hero: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, padding: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text, lineHeight: 20 },
  category: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted, marginTop: 2 },
  benefitBox: { flexDirection: 'row', gap: 6, backgroundColor: '#f8fafc', borderRadius: 10, padding: 11, marginTop: 12 },
  benefit: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 16 },
  desc: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 17, marginTop: 11 },

  progressTop: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14 },
  percent: { fontSize: 24, fontFamily: 'Manrope-ExtraBold' },
  raised: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  target: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  track: { height: 7, backgroundColor: theme.colors.surfaceMuted, borderRadius: 4, marginTop: 9, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  heroMeta: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },

  facts: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginTop: 11 },
  factCell: { flex: 1, alignItems: 'center' },
  factValue: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  factLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2, textAlign: 'center' },

  mineBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 12, padding: 13, marginTop: 11 },
  mineTitle: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#065f46' },
  mineHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: '#047857', marginTop: 2 },

  actions: { marginTop: 12 },
  giveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 13 },
  giveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  closedBox: { flexDirection: 'row', gap: 7, backgroundColor: '#f8fafc', borderRadius: 11, padding: 12 },
  closedText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 15 },

  sectionTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginTop: 18, marginBottom: 8 },
  moreNote: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 8, textAlign: 'center' },
});
