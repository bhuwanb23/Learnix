/**
 * The resident profile screen — shell only.
 *
 * Everything below the hero used to live in this one file and reached 515 lines. It is now a
 * hero, a vacate action, and six sections, each owning its own empty state and its own write
 * path:
 *
 *   ProfileSection     identity and current stay
 *   RentSection        dues + "mark paid"
 *   ContactsSection    guardians and emergency contacts (add / edit / remove)
 *   HistorySection     residential move-in / move-out timeline
 *   AbsenceSection     leave and absence, derived from gate passes
 *   ComplaintsSection  complaints raised, read-only here
 *
 * ONE FETCH, NOT SIX
 * ------------------
 * `GET /hostel/residents/:id` already composes identity, allocation, dues, complaints,
 * history, contacts and absence on the server, because they are independent reads over the
 * same student and five round trips to render one screen is five chances to show a spinner.
 * The dedicated `residentHistory` / `residentAbsence` / `residentContacts` endpoints exist
 * for callers that want ONE of those on its own; this screen does not need them.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hostelApi } from '../../../../../../services/api';
import ProfileSection from './components/ProfileSection';
import RentSection from './components/RentSection';
import ContactsSection from './components/ContactsSection';
import HistorySection from './components/HistorySection';
import AbsenceSection from './components/AbsenceSection';
import ComplaintsSection from './components/ComplaintsSection';
import { fmtDate, initials } from './residentMeta';

export default function ResidentDetail({ studentProfileId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await hostelApi.residentDetail(studentProfileId));
    } catch (e) {
      setError(e.message || 'Failed to load resident');
    } finally {
      setLoading(false);
    }
  }, [studentProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const vacate = () => {
    Alert.alert('Vacate room', `Remove ${data.name} from ${data.room}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Vacate',
        style: 'destructive',
        onPress: async () => {
          try {
            await hostelApi.vacateBed(data.bedId);
            // Dues deliberately stay in the ledger. Vacating is a bed state change, not a
            // debt write-off, and silently forgiving what a resident owes on checkout is not
            // something a button should do.
            Alert.alert(
              'Checked out',
              `${data.name} has been vacated. Any outstanding dues remain on record.`,
            );
            onBack();
          } catch (e) {
            Alert.alert('Cannot vacate', e.message);
          }
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading resident…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>Back to residents</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(data.name)}</Text>
          </View>
          <Text style={styles.name}>{data.name}</Text>
          {/* Roll number, not the move-in date, is the identifying line in the hero: it is
              what the warden types into the allocation flow to reach this student. */}
          <Text style={styles.meta}>{data.rollNo || 'No roll number on file'}</Text>
          <View style={styles.roomBadge}>
            <Ionicons name="bed-outline" size={13} color="#fff" />
            <Text style={styles.roomBadgeText}>
              {data.room} · bed {data.bedLabel} · {data.block}
            </Text>
          </View>
          {data.fromDate ? (
            <Text style={styles.since}>In residence since {fmtDate(data.fromDate)}</Text>
          ) : null}
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={vacate}>
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
            <Text style={[styles.actionText, { color: '#dc2626' }]}>Vacate</Text>
          </TouchableOpacity>
        </View>

        <ProfileSection resident={data} />
        <RentSection resident={data} onChanged={load} />
        <ContactsSection
          studentProfileId={data.studentProfileId ?? studentProfileId}
          contacts={data.contacts}
          onChanged={load}
        />
        <HistorySection history={data.history} />
        <AbsenceSection absence={data.absence} />
        <ComplaintsSection complaints={data.complaints} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  errorText: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: '#dc2626',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  backLink: { marginTop: 12, padding: 6 },
  backLinkText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 24, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  name: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 3,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  roomBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 5,
  },
  since: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
  },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionDanger: { flex: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionText: { fontSize: 13, fontFamily: 'Manrope-Bold', marginLeft: 6 },
});