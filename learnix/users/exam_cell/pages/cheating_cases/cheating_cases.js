/**
 * X-08 — Cheating cases: the hub.
 * (docs/users/05 §3.6)
 *
 * WHAT THIS IS
 * ------------
 * The queue of every case in the institution, and the doorway to the other four blocks.
 *
 * WAS A CORRUPTED FILE. It arrived as fifteen physical lines containing four hundred and ninety-one
 * literal `\n` escape sequences — the whole source written with escaped newlines that were never
 * interpreted, so it could not parse and the exam cell app crashed on opening this screen. It has been
 * rebuilt against the live API rather than repaired, because the behaviour it described (a flat list
 * with a "resolve" button and a fake create modal) is not the behaviour the module promises.
 *
 * THE BLOCK LIST COMES FROM THE SERVER
 * -----------------------------------
 * It arrives from `/examcell/cheating-cases/catalogue` with each block's id, label, icon, colour
 * and route, so a block added on the server draws itself. `cheating_casesMeta.js` mirrors the ids
 * because the five sub-screens are separate modules that must exist at build time, and
 * `audit-cheating-ui.ts` asserts the two agree. The mirror is the FALLBACK for the frame before the
 * catalogue lands, and nothing more.
 *
 * THE HERO ANSWERS THE ONE QUESTION THIS DESK EXISTS TO ANSWER
 * -----------------------------------------------------------
 * Not "how many cases are there" — every desk can count. It is "how much of this is waiting on a
 * decision, and how much of it has been waiting too long". A high-risk case that has sat unreviewed
 * for a fortnight is a failure of the desk and not of the student, and the number that matters is the
 * overdue one.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examcellApi } from '../../../../services/api';
import {
  AMBER,
  BLOCKS,
  GREEN,
  MUTED,
  RED,
  SLATE,
  THEME,
  VIOLET,
  plural,
} from './cheating_casesMeta';
import {
  CaseRow,
  CheatingScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  StatGrid,
  useCheating,
} from './cheating_casesUi';

export default function CheatingCasesModule({ navigation }) {
  const catalogue = useCheating(() => examcellApi.cheatingCatalogue(), []);
  const queue = useCheating(() => examcellApi.cheatingCases({ pageSize: 20 }), []);

  const reload = useCallback(() => {
    catalogue.reload();
    queue.reload();
  }, [catalogue, queue]);

  // The block list comes from the server. The mirror in cheating_casesMeta.js is the FALLBACK for the
  // frame before the catalogue lands, and nothing more — a fallback that also acted as the source
  // would be a second list to keep true.
  const blocks = catalogue.data?.blocks?.length ? catalogue.data.blocks : BLOCKS;
  const stats = catalogue.data?.stats;
  const cases = queue.data?.cases ?? [];

  // Every block card carries the live number that block exists to report. A badge of 0 is NOT drawn:
  // an eight-row list of zeroes is noise.
  const badgeFor = (id) => {
    if (!stats) return undefined;
    switch (id) {
      case 'QUEUE': return stats.open;
      case 'REPORT': return undefined;
      case 'COMMITTEE': return stats.committee;
      case 'HISTORY': return stats.total - stats.open;
      case 'CASE': return undefined;
      default: return undefined;
    }
  };

  const open = (block) => {
    // The CASE block needs a case to be a case file, and the hub is a list of cases — so it opens
    // the first one the queue is showing. If there is none, the block is not offered.
    if (block.id === 'CASE') {
      if (!cases.length) return;
      navigation?.navigate?.(block.route, { caseId: cases[0].id });
      return;
    }
    navigation?.navigate?.(block.route);
  };

  if (catalogue.loading && !catalogue.data) {
    return (
      <CheatingScreen title="Cheating Cases" blurb="The exam cell's malpractice desk.">
        <LoadingState label="Loading the case desk" />
      </CheatingScreen>
    );
  }

  if (catalogue.error && !catalogue.data) {
    return (
      <CheatingScreen title="Cheating Cases" blurb="The exam cell's malpractice desk.">
        <ErrorState message={catalogue.error} onRetry={reload} />
      </CheatingScreen>
    );
  }

  return (
    <CheatingScreen
      title="Cheating Cases"
      blurb="Report malpractice, work the queue, and see what has been decided."
      right={
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation?.navigate?.('CheatingCasesReport')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.headerBtnText}>Report</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={queue.refreshing} onRefresh={reload} tintColor={THEME} />
        }
      >
        <StatGrid
          stats={[
            { label: 'Open', value: stats?.open, tone: AMBER },
            { label: 'Overdue', value: stats?.overdue, tone: RED },
            { label: 'With committee', value: stats?.committee, tone: VIOLET },
            { label: 'Confirmed', value: stats?.confirmed, tone: RED },
            { label: 'Dismissed', value: stats?.dismissed, tone: GREEN },
          ]}
        />

        <Text style={styles.sectionLabel}>The desk</Text>
        <View style={styles.blockGrid}>
          {blocks.map((b) => {
            const badge = badgeFor(b.id);
            const isCase = b.id === 'CASE';
            if (isCase && !cases.length) return null;
            return (
              <TouchableOpacity
                key={b.id}
                style={styles.blockCard}
                onPress={() => open(b)}
                activeOpacity={0.8}
              >
                <View style={styles.blockTop}>
                  <View style={[styles.blockIcon, { backgroundColor: b.color + '14' }]}>
                    <Ionicons name={b.icon} size={16} color={b.color} />
                  </View>
                  {badge !== undefined && badge !== null ? (
                    <View style={[styles.blockBadge, { backgroundColor: b.color }]}>
                      <Text style={styles.blockBadgeText}>{badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.blockLabel}>{b.label}</Text>
                <Text style={styles.blockBlurb}>{b.blurb}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.queueHead}>
          <Text style={styles.sectionLabel}>Waiting on a decision</Text>
          <Text style={styles.queueCount}>{plural(cases.length, 'case')}</Text>
        </View>

        {queue.loading && !queue.data ? (
          <LoadingState label="Loading the queue" />
        ) : queue.error ? (
          <ErrorState message={queue.error} onRetry={queue.reload} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="Nothing waiting"
            message="No case is waiting on a decision. Anything raised will appear here."
            action="Report an incident"
            onAction={() => navigation?.navigate?.('CheatingCasesReport')}
          />
        ) : (
          cases.map((c) => (
            <CaseRow
              key={c.id}
              item={c}
              onPress={() => navigation?.navigate?.('CheatingCasesDetail', { caseId: c.id })}
            />
          ))
        )}

        {queue.data?.pagination?.hasMore ? (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() =>
              navigation?.navigate?.('CheatingCasesQueue', { filter: { status: 'OPEN' } })
            }
            activeOpacity={0.8}
          >
            <Text style={styles.moreText}>See the whole queue</Text>
            <Ionicons name="chevron-forward" size={14} color={THEME} />
          </TouchableOpacity>
        ) : null}

        <Text style={styles.footNote}>
          A case can end a student's degree. Every decision is recorded on the case file, and the
          student is told.
        </Text>
        <Text style={styles.footNote}>
          An EMERGENCY notice reaches a resident even when they have turned the other categories
          off. A mute is a preference about noise, not about safety.
        </Text>
      </ScrollView>
    </CheatingScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  headerBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SLATE,
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingHorizontal: 20 },
  blockCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 13,
  },
  blockTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    alignItems: 'center',
  },
  blockBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  blockLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 9 },
  blockBlurb: { fontSize: 10.5, color: MUTED, marginTop: 3, lineHeight: 15 },

  queueHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 20,
  },
  queueCount: { fontSize: 11, color: MUTED, marginTop: 14 },

  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: 20,
    marginTop: 6,
    paddingVertical: 11,
  },
  moreText: { fontSize: 12, fontWeight: '600', color: THEME },

  footNote: {
    fontSize: 10.5,
    color: MUTED,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 34,
    lineHeight: 16,
  },
});
