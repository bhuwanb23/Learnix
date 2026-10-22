/**
 * HD-06 — The HOD's Courses desk: the Course Health Indicator on screen.
 * Docs: 11-hod.md §3.3
 *
 * THE GAUGE AND ITS BREAKDOWN, IN ONE PLACE
 * ------------------------------------------
 * Because the gauge and the breakdown answer ONE question — "how is this course, and what should
 * I fix first?" — and a screen that draws the score in one place and the legs in another invites
 * a reader to compare two numbers that were computed at different moments.
 *
 * THE NOTE UNDER THE GAUGE NAMES THE LEGS THAT WERE LEFT OUT
 * ----------------------------------------------------------
 * A score of 70 computed from two of three measures is a different claim from a score of 70
 * computed from all three, and a reader who cannot tell the difference cannot trust either. So
 * the note says which measures had no data and were excluded — the same rule the Department
 * Health Score follows, and for the same reason.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MUTED, SLATE, healthBandMeta, healthColor, healthIcon, percent } from './coursesMeta';
import { styles } from './coursesStyles';

/**
 * THE COURSE HEALTH INDICATOR, as a gauge.
 *
 * The BAND is the decision and the NUMBER is the tracking. A HOD does not act on "68.4" — they
 * act on "WATCH" — but they want the number to see whether it is moving.
 */
export function HealthGauge({ health }) {
  if (!health) return null;
  const band = health.band ? healthBandMeta(health.band) : null;
  const color = band?.color ?? MUTED;
  const value = health.score === null || health.score === undefined ? null : Math.round(health.score);
  const weakest = (health.breakdown ?? []).find((b) => b.id === health.weakest);

  return (
    <View style={styles.gauge}>
      <View style={styles.gaugeRow}>
        <View style={styles.flex}>
          <Text style={styles.gaugeLabel}>Course health</Text>
          <Text style={[styles.gaugeBand, { color }]}>
            {value === null ? 'Not enough data' : band?.label ?? health.band}
          </Text>
          {weakest ? (
            <Text style={styles.gaugeWeakest}>
              Weakest: {weakest.label} ({percent(weakest.value)})
            </Text>
          ) : null}
        </View>
        <View style={[styles.gaugeScore, { borderColor: color, backgroundColor: `${color}14` }]}>
          <Text style={[styles.gaugeValue, { color }]}>{value === null ? '—' : value}</Text>
        </View>
      </View>
      {health.note ? <Text style={styles.gaugeNote}>{health.note}</Text> : null}
    </View>
  );
}

/**
 * The three legs, and which of them counted.
 *
 * A leg with no data says so and is left out of the score. A leg with a number says what share of
 * the score it carries.
 */
export function HealthBreakdown({ health }) {
  if (!health) return null;
  return (
    <View style={styles.breakdown}>
      {(health.breakdown ?? []).map((b) => (
        <View key={b.id} style={styles.legRow}>
          <View style={[styles.legIcon, { backgroundColor: `${b.color ?? SLATE}18` }]}>
            <Ionicons
              name={b.icon ?? healthIcon(b.id)}
              size={14}
              color={b.color ?? healthColor(b.id)}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.legLabel}>{b.label}</Text>
            <Text style={styles.legMeta}>
              {b.included
                ? `${percent(b.value)} · ${Math.round((b.weight ?? 0) * 100)}% of the score`
                : 'no data yet — left out of the score'}
            </Text>
          </View>
          <Text style={[styles.legValue, { color: b.included ? (b.color ?? SLATE) : MUTED }]}>
            {b.included ? percent(b.value) : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}
