import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import {
  inr,
  barPercent,
  campaignStatusMeta,
  deadlineLabel,
  relativeDay,
} from '../donationsMeta';

/**
 * A fundraising campaign.
 *
 * Colour comes from the campaign's CATEGORY, not from its position in the list.
 * The old screen indexed a palette by array index, so adding a campaign
 * recoloured every card below it and nothing the colour meant stayed true.
 */
export function CampaignCard({ campaign, onOpen, onGive, showGive = true }) {
  const meta = campaignStatusMeta(campaign);
  const urgent = campaign.isOpen && campaign.daysLeft !== null && campaign.daysLeft <= 7;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.85}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name="megaphone-outline" size={17} color={meta.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name} numberOfLines={2}>
            {campaign.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.tag, { color: meta.color, backgroundColor: meta.color + '14' }]}>
              {meta.label}
            </Text>
            {/* Urgency is stated, not left to the reader to infer from a date. */}
            <Text style={[styles.meta, urgent && { color: '#dc2626' }]}>{deadlineLabel(campaign)}</Text>
          </View>
        </View>
        <Text style={[styles.percent, { color: meta.color }]}>{campaign.percent}%</Text>
      </View>

      {/* The bar clamps at 100% while the number above stays true: an overshot
          campaign is a real outcome, and hiding it would be a lie in the other
          direction. */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${barPercent(campaign.percent)}%`, backgroundColor: meta.color },
          ]}
        />
      </View>

      <View style={styles.foot}>
        <Text style={styles.raised}>{inr(campaign.raisedRupees)}</Text>
        <Text style={styles.meta}> of {inr(campaign.targetRupees)}</Text>
        <View style={{ flex: 1 }} />
        {campaign.met ? (
          <Text style={styles.donorCount}>Target met</Text>
        ) : (
          <Text style={styles.donorCount}>
            {inr(campaign.remainingRupees)} to go
          </Text>
        )}
      </View>

      <View style={styles.donorLine}>
        <Ionicons name="people-outline" size={11} color={theme.colors.textMuted} />
        <Text style={styles.meta}>
          {campaign.donorCount} donor{campaign.donorCount === 1 ? '' : 's'}
          {campaign.pledgeCount > campaign.donorCount
            ? ` · ${campaign.pledgeCount - campaign.donorCount} pledged, not yet received`
            : ''}
        </Text>
      </View>

      {campaign.myContributionRupees ? (
        <View style={styles.mineBox}>
          <Ionicons name="heart" size={11} color="#059669" />
          <Text style={styles.mineText}>You have given {inr(campaign.myContributionRupees)} here</Text>
        </View>
      ) : null}

      {showGive ? (
        <TouchableOpacity
          style={[styles.giveBtn, !campaign.isOpen && styles.giveBtnClosed]}
          onPress={onGive}
          disabled={!campaign.isOpen}
        >
          <Ionicons name="hand-left-outline" size={13} color="#fff" />
          <Text style={styles.giveText}>
            {campaign.isOpen ? 'Donate to this cause' : 'Closed to donations'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

/** Compact campaign row, for the detail screen's "other campaigns" strip. */
export function CampaignRow({ campaign, onPress }) {
  const meta = campaignStatusMeta(campaign);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.iconSm, { backgroundColor: meta.color + '18' }]}>
        <Ionicons name="megaphone-outline" size={13} color={meta.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 9 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {campaign.name}
        </Text>
        <Text style={styles.meta}>{relativeDay(campaign.deadline)}</Text>
      </View>
      <Text style={[styles.rowPct, { color: meta.color }]}>{campaign.percent}%</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconSm: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tag: { fontSize: 9, fontFamily: 'Manrope-Bold', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  percent: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', marginLeft: 8 },

  track: { height: 6, backgroundColor: theme.colors.surfaceMuted, borderRadius: 3, marginTop: 11, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },

  foot: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  raised: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  donorCount: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  donorLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 7 },

  mineBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ecfdf5', borderRadius: 9, padding: 9, marginTop: 9 },
  mineText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: '#047857' },

  giveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#059669',
    borderRadius: 11,
    paddingVertical: 10,
    marginTop: 11,
  },
  // A closed campaign still shows the control, because a donor looking at an
  // expired appeal deserves to learn it is closed rather than to find no button
  // and no explanation.
  giveBtnClosed: { backgroundColor: '#94a3b8' },
  giveText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 10, marginBottom: 7 },
  rowName: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  rowPct: { fontSize: 11, fontFamily: 'Manrope-ExtraBold' },
});
