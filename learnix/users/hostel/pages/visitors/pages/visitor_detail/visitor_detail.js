/**
 * One visitor, in full, as a timeline.
 *
 * WHY A TIMELINE
 * --------------
 * A visit is a sequence - expected, confirmed, arrived, left — and the facts a warden needs are
 * the GAPS. "Expected 18:00–20:00, confirmed 17:10, arrived 19:40, still here at 21:00" is one
 * story; four separate labelled fields is not. Each step draws its own timestamp, and a planned
 * step that has not happened is drawn hollow so the gap is visible rather than inferred.
 *
 * WHY THE ALERTS GET THEIR OWN BLOCK
 * ----------------------------------
 * On the list, a badge says "restricted". Here, every reason is stated in full with the barred
 * reason spelled out, because this is the screen where somebody decides whether to let this
 * person in — and "Restricted" alone would not be enough to justify it.
 *
 * NOTHING IS DERIVED HERE. The lifecycle, the alerts and the lateness all arrive from
 * `hostel-visitors.rules.ts` via the API. A client-side copy could disagree with the sort order
 * that put this row on top of the list, and there would be no way to tell which was right.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hostelApi } from '../../../../../../services/api';
import {
  lifecycleMeta,
  alertMeta,
  fmtDateTime,
  SectionCard,
  Empty,
  Divider,
  initials,
} from '../../visitorMeta';

/** One rail step. `met` separates a step that HAPPENED from one that was only PLANNED. */
function Step({ icon, label, planned, actual, met, tone = theme.colors.textMuted }) {
  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View style={[styles.node, { borderColor: met ? tone : theme.colors.border, backgroundColor: met ? tone : 'transparent' }]}>
          <Ionicons name={icon} size={11} color={met ? '#fff' : theme.colors.textMuted} />
        </View>
        <View style={styles.railLine} />
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepLabel, met && { color: theme.colors.text, fontFamily: 'Manrope-SemiBold' }]}>
          {label}
        </Text>
        <Text style={styles.stepTime}>{actual ?? (planned ? `Planned ${fmtDateTime(planned)}` : '—')}</Text>
      </View>
    </View>
  );
}

export default function VisitorDetail({ visitorId, onBack, onApprove, onReject, onEntry, onExit, onChanged }) {
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVisitor(await hostelApi.visitor(visitorId));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [visitorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Any mutation returns the shaped visitor, so the screen updates from the RESPONSE rather than
  // re-fetching - which also means a refusal leaves the previous state visible instead of blank.
  const after = async (fn) => {
    try {
      setVisitor(await fn());
      onChanged?.();
    } catch (e) {
      Alert.alert('Could not complete', e.message);
      // Re-read anyway: a failure may still have changed something server-side (a partial write),
      // and leaving a stale card on screen would be worse than one extra request.
      load();
    }
  };

  if (loading && !visitor) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !visitor) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!visitor) return null;

  const meta = lifecycleMeta(visitor.lifecycle);
  const decidable = visitor.lifecycle === 'awaiting_approval';
  const canEnter = visitor.lifecycle === 'approved';
  const canExit = visitor.lifecycle === 'in_campus' || visitor.lifecycle === 'visit_overdue';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.back} onPress={onBack}>
          <Ionicons name="chevron-back" size={17} color={theme.colors.textMuted} />
          <Text style={styles.backText}>All visitors</Text>
        </TouchableOpacity>

        <LinearGradient colors={['#0891b2', '#0e7490']} style={styles.hero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroInitials}>{initials(visitor.name)}</Text>
          </View>
          <Text style={styles.heroName}>{visitor.name}</Text>
          <Text style={styles.heroMeta}>
            {visitor.relation} · visiting {visitor.visiting}
            {visitor.room ? ` · Room ${visitor.room}` : ''}
          </Text>
          <View style={[styles.heroChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.heroChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </LinearGradient>

        {/* Alerts, in full. This is the screen where somebody decides whether to admit. */}
        {visitor.alerts?.length ? (
          <View style={styles.alertBlock}>
            {visitor.alerts.map((a) => {
              const am = alertMeta(a.code);
              return (
                <View key={a.code} style={[styles.alertCard, { backgroundColor: am.bg }]}>
                  <Ionicons name={am.icon} size={16} color={am.color} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.alertTitle, { color: am.color }]}>{am.label}</Text>
                    <Text style={styles.alertMessage}>{a.message}</Text>
                    {a.code === 'BARRED' && visitor.barredReason ? (
                      <Text style={styles.alertBecause}>On the list because: {visitor.barredReason}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Actions. Each is gated on the DERIVED state, so the buttons cannot disagree with the card. */}
        {(decidable || canEnter || canExit) && (
          <View style={styles.actionBar}>
            {decidable ? (
              <>
                <TouchableOpacity style={[styles.actionBtn, styles.refuseBtn]} onPress={() => onReject(visitor)}>
                  <Text style={styles.refuseText}>Refuse</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={() => after(() => hostelApi.approveVisitor(visitor.id, null))}
                >
                  <Text style={styles.confirmText}>Confirm visit</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {canEnter ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.entryBtn]}
                onPress={() => after(() => hostelApi.visitorEntry(visitor.id))}
              >
                <Ionicons name="log-in-outline" size={14} color="#fff" />
                <Text style={styles.entryText}>Record entry</Text>
              </TouchableOpacity>
            ) : null}
            {canExit ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.exitBtn]}
                onPress={() => after(() => hostelApi.visitorExit(visitor.id))}
              >
                <Ionicons name="log-out-outline" size={14} color="#fff" />
                <Text style={styles.entryText}>Record exit</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* The timeline. */}
        <SectionCard title="Visit">
          <Step
            icon="document-text-outline"
            label="Registered"
            planned={null}
            actual={fmtDateTime(visitor.createdAt)}
            met
          />
          <Step
            icon="person-circle-outline"
            label="Expected"
            planned={visitor.expectedInAt}
            actual={visitor.expectedInAt ? fmtDateTime(visitor.expectedInAt) : null}
            met={false}
          />
          <Step
            icon="shield-checkmark-outline"
            label={visitor.status === 'REJECTED' ? 'Refused' : visitor.status === 'CANCELLED' ? 'Withdrawn by resident' : 'Confirmed by warden'}
            planned={null}
            actual={visitor.approvedAt ? fmtDateTime(visitor.approvedAt) : visitor.status === 'PENDING' ? null : fmtDateTime(visitor.createdAt)}
            met={visitor.status !== 'PENDING' && visitor.status !== 'CANCELLED'}
            tone={visitor.status === 'REJECTED' ? '#dc2626' : visitor.status === 'CANCELLED' ? '#64748b' : '#059669'}
          />
          <Step
            icon="log-in-outline"
            label="Entered the gate"
            planned={null}
            actual={visitor.checkInAt ? fmtDateTime(visitor.checkInAt) : null}
            met={!!visitor.checkInAt}
            tone="#2563eb"
          />
          <Step
            icon="log-out-outline"
            label="Left"
            planned={visitor.expectedOutAt}
            actual={visitor.checkOutAt ? fmtDateTime(visitor.checkOutAt) : null}
            met={!!visitor.checkOutAt}
            tone="#0f766e"
          />
        </SectionCard>

        <SectionCard title="Who and why">
          <Row label="Relation" value={visitor.relation} />
          <Row label="Purpose" value={visitor.purpose ?? 'Not stated'} />
          <Row label="Phone" value={visitor.phone ?? 'Not recorded'} />
          {visitor.idNumber ? (
            <>
              <Divider />
              <Row label="ID proof" value={`${visitor.idType ?? 'Unspecified'} · ${visitor.idNumber}`} />
            </>
          ) : null}
          {visitor.decisionNote ? (
            <>
              <Divider />
              <Row label="Warden's note" value={visitor.decisionNote} />
            </>
          ) : null}
        </SectionCard>

        {visitor.visitCountInWindow > 1 ? (
          <SectionCard title="History">
            <Text style={styles.historyLine}>
              This person has visited {visitor.visitCountInWindow} times in the counting window.
              {visitor.visitCountInWindow >= 4 ? ' Worth recognising.' : ''}
            </Text>
          </SectionCard>
        ) : null}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 20 },
  back: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted, marginLeft: 4 },
  hero: { alignItems: 'center', paddingVertical: 20, marginHorizontal: 16, borderRadius: 18 },
  heroAvatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  heroInitials: { fontSize: 19, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  heroName: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: '#fff', marginTop: 9 },
  heroMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  heroChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginTop: 9 },
  heroChipText: { fontSize: 11, fontFamily: 'Manrope-Bold', marginLeft: 4 },
  alertBlock: { paddingHorizontal: 16, marginTop: 14 },
  alertCard: { flexDirection: 'row', borderRadius: 12, padding: 12, marginBottom: 8 },
  alertTitle: { fontSize: 12, fontFamily: 'Manrope-ExtraBold' },
  alertMessage: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 2 },
  alertBecause: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  actionBar: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 11, paddingVertical: 12, marginHorizontal: 4,
  },
  confirmBtn: { backgroundColor: '#059669' },
  confirmText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  refuseBtn: { backgroundColor: '#fee2e2' },
  refuseText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#dc2626' },
  entryBtn: { backgroundColor: '#2563eb' },
  exitBtn: { backgroundColor: '#0f766e' },
  entryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 5 },
  step: { flexDirection: 'row' },
  rail: { width: 24, alignItems: 'center' },
  node: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  railLine: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginVertical: 2 },
  stepBody: { flex: 1, paddingBottom: 14, paddingLeft: 4 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  stepTime: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, flex: 1 },
  rowValue: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.text, flex: 1.4, textAlign: 'right' },
  historyLine: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  errorText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#dc2626', marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9 },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
});