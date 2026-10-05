import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { SkeletonCard, EmptyState } from '../../../../../components/ui';
import { inr, inrExact, barPercent, lookup, FUNDS, campaignStatusMeta } from '../donationsMeta';

/**
 * Contribution impact — what the money did, and where it went.
 *
 * Everything here is DERIVED from the caller's own gifts plus the campaigns they
 * touched, computed server-side. Nothing is invented: there is no "students
 * helped" counter in this schema, so the screen does not claim one. What it can
 * honestly say is how much was given, to which causes, over how long, and how
 * much of each target that represents.
 */
export function ImpactPanel({ impact, loading, onGive, onOpenCampaign }) {
  if (loading) {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (!impact) {
    return (
      <EmptyState
        icon="analytics-outline"
        title="Impact unavailable"
        subtitle="We could not load your giving summary just now."
        color="#059669"
      />
    );
  }

  const gifts = impact.gifts ?? [];
  const campaigns = impact.campaigns ?? [];

  if (gifts.length === 0 && !impact.lifetimeRupees) {
    return (
      <EmptyState
        icon="heart-outline"
        title="Your giving story starts here"
        subtitle="Once you give, this page shows what you have given, which causes it went to, and how far along each one is."
        actionLabel="Make your first gift"
        onAction={onGive}
        color="#059669"
      />
    );
  }

  const maxFund = Math.max(1, ...(impact.byFund ?? []).map((f) => f.amountRupees));

  return (
    <View style={styles.wrap}>
      {/* Lifetime giving */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Your lifetime giving</Text>
        <Text style={styles.heroValue}>{inrExact(impact.lifetimeRupees)}</Text>
        <Text style={styles.heroSub}>
          {impact.giftCount} gift{impact.giftCount === 1 ? '' : 's'} recorded
          {impact.firstGiftAt ? ` · first in ${impact.firstGiftYear ?? ''}` : ''}
        </Text>
        {impact.pendingRupees > 0 ? (
          <View style={styles.pendingBox}>
            <Ionicons name="hourglass-outline" size={12} color="#d97706" />
            <Text style={styles.pendingText}>
              {inrExact(impact.pendingRupees)} pledged but not yet confirmed. Receipts follow the money, not the promise.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stats}>
        <Stat value={String(impact.campaignCount)} label="causes supported" />
        <Stat value={String(impact.standingCount)} label="standing gifts" />
        <Stat value={impact.anonymousCount > 0 ? String(impact.anonymousCount) : '—'} label="anonymous gifts" />
      </View>

      {/* By fund — a bar per cause, scaled against this donor's own largest gift so
          the chart is comparable rather than dominated by the programme total. */}
      {(impact.byFund ?? []).length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where your money went</Text>
          {(impact.byFund ?? []).map((f) => {
            const meta = lookup(FUNDS, f.fund);
            return (
              <View key={f.fund} style={styles.fundRow}>
                <View style={styles.fundHead}>
                  <Ionicons name={meta.icon} size={11} color={meta.color} />
                  <Text style={styles.fundLabel}>{meta.label}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.fundValue}>{inrExact(f.amountRupees)}</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${barPercent((f.amountRupees / maxFund) * 100)}%`, backgroundColor: meta.color },
                    ]}
                  />
                </View>
                <Text style={styles.fundCount}>
                  {f.count} gift{f.count === 1 ? '' : 's'} · {Math.round((f.amountRupees / Math.max(1, impact.lifetimeRupees)) * 100)}% of your giving
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Per-campaign: how much this donor gave, and how close the cause is overall. */}
      {campaigns.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Causes you have supported</Text>
          {campaigns.map((c) => {
            const meta = campaignStatusMeta(c);
            return (
              <TouchableOpacity key={c.id} style={styles.campaignRow} onPress={() => onOpenCampaign?.(c.id)}>
                <View style={styles.campaignHead}>
                  <Text style={styles.campaignName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.campaignMine}>{inrExact(c.myRupees)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${barPercent(c.percent)}%`, backgroundColor: meta.color }]} />
                </View>
                <Text style={styles.campaignMeta}>
                  {inr(c.raisedRupees)} of {inr(c.targetRupees)} raised · {c.percent}%
                  {c.status === 'COMPLETED' || !c.isOpen ? ' · closed' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.honestBox}>
        <Ionicons name="information-circle-outline" size={13} color={theme.colors.textMuted} />
        <Text style={styles.honestText}>
          This page reports your own giving and the progress of the causes you touched. It does not claim a number of
          beneficiaries, because the college does not yet record a link between a gift and an individual student.
        </Text>
      </View>

      {onGive ? (
        <TouchableOpacity style={styles.giveBtn} onPress={onGive}>
          <Ionicons name="hand-left-outline" size={15} color="#fff" />
          <Text style={styles.giveText}>Give again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },
  hero: { backgroundColor: '#059669', borderRadius: 16, padding: 18 },
  heroLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 26, fontFamily: 'Manrope-ExtraBold', color: '#fff', marginTop: 6 },
  heroSub: { fontSize: 10, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  pendingBox: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 10, padding: 10, marginTop: 11 },
  pendingText: { flex: 1, fontSize: 9, fontFamily: 'Manrope-Medium', color: '#fff', lineHeight: 14 },

  stats: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginTop: 11 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  statLabel: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2, textAlign: 'center' },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginTop: 11 },
  cardTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 11 },

  fundRow: { marginBottom: 12 },
  fundHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fundLabel: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  fundValue: { fontSize: 11, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  track: { height: 6, backgroundColor: theme.colors.surfaceMuted, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  fundCount: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 5 },

  campaignRow: { marginBottom: 13 },
  campaignHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campaignName: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  campaignMine: { fontSize: 11, fontFamily: 'Manrope-ExtraBold', color: '#059669' },
  campaignMeta: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 5 },

  honestBox: { flexDirection: 'row', gap: 7, backgroundColor: '#fff', borderRadius: 11, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginTop: 4 },
  honestText: { flex: 1, fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 14 },

  giveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 13, marginTop: 14, marginBottom: 10 },
  giveText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
