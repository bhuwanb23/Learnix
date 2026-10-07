/**
 * Donation Summary — what THIS graduate has given, and to which causes.
 *
 * RECEIVED AND PLEDGED ARE NEVER ADDED TOGETHER
 * ---------------------------------------------
 * The two totals are shown separately, on purpose. A card reading "₹5.25 L given" for
 * money the bank has not cleared would be a number the donor cannot reconcile against
 * their own statement, and the natural conclusion is that the app is broken. Pledged sits
 * beside received, labelled, so the gap between intention and cleared money is visible.
 *
 * `unrestrictedOnly` IS A DISTINCT STATE, NOT AN ERROR
 * ---------------------------------------------------
 * A gift with no campaign is legitimate — the donation model has a nullable `campaignId`
 * precisely so unrestricted gifts are possible. So "gave, but to the general fund" and
 * "gave nothing" render differently, and the first does not show an empty campaign list as
 * though something failed.
 *
 * Campaign percentages are SCHOOL progress, not the donor's share. Labelled as such: a
 * graduate who gave ₹500 to a ₹40 lakh campaign has contributed 0% of it, and implying
 * otherwise by putting their amount next to the bar would be the more flattering reading.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import DashCard, { DashEmpty, Progress } from './DashCard';
import { EMPTY_COPY, SECTIONS, countLabel, fmtRupees } from '../dashboardMeta';

const META = SECTIONS.find((s) => s.key === 'giving');

export default function GivingCard({ giving, onGive, onOpenCampaign }) {
  const g = giving ?? { receivedRupees: 0, receivedCount: 0, pledgedRupees: 0, pledgedCount: 0, campaigns: [] };
  const hasGiven = g.receivedCount > 0 || g.pledgedCount > 0;

  if (!hasGiven) {
    return (
      <DashCard title={META.title} icon={META.icon} accent={META.accent}>
        <DashEmpty
          {...EMPTY_COPY.giving}
          accent={META.accent}
          actionLabel="Give"
          onAction={onGive}
        />
      </DashCard>
    );
  }

  return (
    <DashCard
      title={META.title}
      icon={META.icon}
      accent={META.accent}
      actionLabel="Give"
      onAction={onGive}
    >
      <View style={styles.totals}>
        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Received</Text>
          <Text style={[styles.totalValue, { color: META.accent }]} numberOfLines={1}>
            {fmtRupees(g.receivedRupees)}
          </Text>
          <Text style={styles.totalMeta}>
            {g.receivedCount > 0 ? countLabel(g.receivedCount, 'gift') : 'Nothing cleared yet'}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalBlock}>
          <Text style={styles.totalLabel}>Pledged</Text>
          {/* Muted when zero: an unfulfilled pledge is not a failure, but it is not
              money either, and it should not be coloured like it. */}
          <Text
            style={[
              styles.totalValue,
              g.pledgedCount > 0 ? { color: theme.colors.textSecondary } : styles.totalValueZero,
            ]}
            numberOfLines={1}
          >
            {fmtRupees(g.pledgedRupees)}
          </Text>
          <Text style={styles.totalMeta}>
            {g.pledgedCount > 0 ? countLabel(g.pledgedCount, 'gift') : 'Nothing pending'}
          </Text>
        </View>
      </View>

      {g.campaigns?.length ? (
        <View style={styles.campaigns}>
          {g.campaigns.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => onOpenCampaign?.(c)}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${c.percent} percent funded`}
              style={[styles.campaign, i > 0 && styles.campaignDivided]}
            >
              <View style={styles.campaignBody}>
                <Text style={styles.campaignName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Progress percent={c.percent} accent={META.accent} />
                <Text style={styles.campaignMeta}>
                  {fmtRupees(c.raisedRupees)} of {fmtRupees(c.targetRupees)} raised ·{' '}
                  {c.percent}%
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={13} color={theme.colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>
      ) : g.unrestrictedOnly ? (
        <View style={[styles.note, { backgroundColor: `${META.accent}0f` }]}>
          <Ionicons name="information-circle-outline" size={13} color={META.accent} />
          <Text style={styles.noteText}>Given to the general fund — not tied to a campaign.</Text>
        </View>
      ) : null}
    </DashCard>
  );
}

const styles = StyleSheet.create({
  totals: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  totalBlock: {
    flex: 1,
    gap: 2,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.borderLight,
    marginHorizontal: 12,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  totalValueZero: {
    color: theme.colors.textLight,
    fontWeight: '700',
  },
  totalMeta: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
  campaigns: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 2,
  },
  campaign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
  },
  campaignDivided: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  campaignBody: {
    flex: 1,
    gap: 5,
  },
  campaignName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  campaignMeta: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
    padding: 8,
    borderRadius: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 10.5,
    color: theme.colors.textTertiary,
  },
});