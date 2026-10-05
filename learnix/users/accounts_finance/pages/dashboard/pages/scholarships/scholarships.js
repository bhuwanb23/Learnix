// F-11 Dashboard — Scholarship status (docs/users/06 §3.11, block 5).
//
// "Approved, pending and disbursed scholarships" — three words in the requirement
// that the old screen collapsed into one, and the collapse was the bug. It
// counted `UNDER_REVIEW` applications as `committed` alongside `APPROVED` and
// `DISBURSED`, so an application nobody had decided on was reported as money the
// institution had promised. It also never reported how much had actually REACHED
// a student, so a committee could read "₹75,000 awarded", believe ₹75,000 had
// been handed over, and discover otherwise at the audit.
//
// The five figures, kept apart because they are five different claims:
//
//   requested  what students asked for          — not a fact about the institution
//   pending    APPLIED + UNDER_REVIEW           — nobody has decided
//   approved   a decision was made, a figure granted
//   disbursed  money was allocated onto a student's dues
//   unreleased approved, still not paid          — the gap between a promise and cash
//
// `releasePercent` is null, not 0%, when nothing was granted. "0% released" and
// "nothing was ever promised" are different facts and only one is a problem.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { VIOLET, GREEN, RED, SLATE, MUTED, AMBER, compactRupees, rupees, percentPhrase } from '../../dashboardMeta';
import {
  DashboardEmpty, DashboardScreen, FigureRow, Section, SpendBar, StatGrid, StatCell, goToRoute, useDashboard,
} from '../../dashboardUi';

export default function DashboardScholarships({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardBlock('SCHOLARSHIPS'),
  );

  const s = data ?? {};
  const schemes = s.schemes ?? [];

  return (
    <DashboardScreen
      title="Scholarship status"
      subtitle="What was promised, what was granted, and what actually reached a student."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <Section title="The money, in five parts" note={`${s.applications ?? 0} application${s.applications === 1 ? '' : 's'}`}>
        <View style={styles.card}>
          <StatGrid>
            <StatCell
              label="Approved"
              value={compactRupees(s.approvedRupees ?? 0)}
              tone={VIOLET}
              hint={`${s.approvedCount ?? 0} awarded`}
            />
            <StatCell
              label="Pending"
              value={compactRupees(s.pendingRupees ?? 0)}
              tone={AMBER}
              hint={`${s.pendingCount ?? 0} undecided`}
            />
            <StatCell
              label="Disbursed"
              value={compactRupees(s.disbursedRupees ?? 0)}
              tone={GREEN}
              hint={`${s.disbursedCount ?? 0} paid out`}
            />
            <StatCell
              label="Not yet released"
              value={compactRupees(s.unreleasedRupees ?? 0)}
              tone={s.unreleasedCount > 0 ? RED : GREEN}
              hint={`${s.unreleasedCount ?? 0} awaiting disbursement`}
            />
          </StatGrid>
        </View>

        {/* The release rate, and the gap it leaves. These are the two figures a
            committee actually asks for, and the old screen answered neither. */}
        {s.approvedRupees > 0 ? (
          <View style={styles.card}>
            <SpendBar
              label="Of what was granted, how much has reached a student"
              percent={s.releasePercent}
              display={percentPhrase(s.releasePercent)}
              sublabel={`${rupees(s.disbursedRupees)} released of ${rupees(s.approvedRupees)}`}
            />
            {s.unreleasedRupees > 0 ? (
              <View style={styles.gap}>
                <Ionicons name="alert-circle-outline" size={14} color={RED} />
                <Text style={styles.gapText}>
                  {rupees(s.unreleasedRupees)} has been approved for {s.unreleasedCount}{' '}
                  {s.unreleasedCount === 1 ? 'student' : 'students'} and not yet paid out. The
                  institution has promised it; the family has not received it.
                </Text>
                <TouchableOpacity
                  onPress={() => goToRoute(navigation, 'ScholarshipTracking', false)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={styles.gapLink}>Release</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <DashboardEmpty
              icon="ribbon-outline"
              title="Nothing has been awarded"
              subtitle="No application has been approved yet, so there is no release rate to show. That is a different situation from approving and releasing nothing."
            />
          </View>
        )}
      </Section>

      {/* Requested is shown because it is what the desk is asked for constantly,
          and it is labelled for what it is: what students asked for, which is not
           a commitment by anyone. */}
      <Section title="What was asked for" note="Not a promise by the institution">
        <View style={styles.card}>
          <FigureRow
            label="Requested by students"
            value={rupees(s.requestedRupees ?? 0)}
            sublabel={
              (s.pendingCount ?? 0) === 0
                ? 'No application is currently awaiting a decision'
                : `${s.pendingCount} still awaiting a decision`
            }
          />
          <FigureRow
            label="Declined"
            value={String(s.rejectedCount ?? 0)}
            tone={SLATE}
            sublabel="Rejected applications are kept for the record, not hidden"
          />
        </View>
      </Section>

      <Section title="By scheme" note="Five largest by amount granted">
        {schemes.length === 0 ? (
          <View style={styles.card}>
            <DashboardEmpty
              icon="school-outline"
              title="No schemes in use"
              subtitle="Once an application is recorded against a scheme it appears here."
            />
          </View>
        ) : (
          <View style={styles.card}>
            {schemes.map((sc) => (
              <TouchableOpacity
                key={sc.name}
                style={styles.scheme}
                activeOpacity={0.8}
                onPress={() => goToRoute(navigation, 'ScholarshipTracking', false)}
                accessibilityRole="button"
              >
                <View style={styles.schemeHead}>
                  <View style={styles.schemeBody}>
                    <Text style={styles.schemeName} numberOfLines={1}>{sc.name}</Text>
                    <Text style={styles.schemeMeta}>
                      {sc.type?.replace(/_/g, ' ')?.toLowerCase()} · {sc.approvedCount} approved
                      {sc.pendingCount > 0 ? ` · ${sc.pendingCount} pending` : ''}
                      {sc.disbursedCount > 0 ? ` · ${sc.disbursedCount} paid` : ''}
                    </Text>
                  </View>
                  <Text style={styles.schemeAmount}>{rupees(sc.grantedRupees)}</Text>
                </View>
                <Text style={styles.schemeRelease}>
                  {sc.grantedRupees > 0
                    ? `${rupees(sc.disbursedRupees)} released (${percentPhrase(sc.releasePercent)})`
                    : 'Nothing granted yet'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Section>

      <Text style={styles.footnote}>
        Approved, pending and disbursed are never added together, because they are three different
        claims about three different states of the same money. An application under review is
        pending — it is not a commitment, and this screen does not report it as one.
        {'\n'}A disbursement is not income: it reduces the student’s dues and creates no payment
        row, so it never appears in collections.
      </Text>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15, marginBottom: 10 },
  gap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    backgroundColor: '#fef2f2', borderRadius: 11, borderWidth: 1, borderColor: '#fecaca', padding: 11,
  },
  gapText: { flex: 1, fontSize: 10, color: '#b91c1c', lineHeight: 15 },
  gapLink: { fontSize: 11, fontWeight: '700', color: RED },
  scheme: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 11 },
  schemeHead: { flexDirection: 'row', alignItems: 'center' },
  schemeBody: { flex: 1, marginRight: 10 },
  schemeName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  schemeMeta: { fontSize: 10, color: SLATE, marginTop: 2, textTransform: 'capitalize' },
  schemeAmount: { fontSize: 13, fontWeight: '800', color: VIOLET },
  schemeRelease: { fontSize: 10, color: SLATE, marginTop: 4 },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
