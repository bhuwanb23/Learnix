/**
 * The room screen — shell only: hero, allocate, and the two sections.
 *
 * Everything below the hero used to live in this one file. It is now:
 *
 *   BedsSection         one row per bed with its real state, plus withdraw / return to service
 *   RoomHistorySection  who has stayed in this room and when they moved in and out
 *
 * TWO FETCHES, NOT FIVE
 * ---------------------
 * `GET /rooms/:id` carries the room and every bed with its occupant in one response. Room
 * history is a separate read because it is unbounded — a room with years of turnover would
 * grow the detail payload for data most visits never scroll to.
 *
 * TRANSFER IS WIRED HERE, AND WAS DEAD BEFORE
 * -------------------------------------------
 * `POST /beds/:bedId/transfer` and `hostelApi.transferBed` both existed and docs §3.2 listed
 * Transfer as a room action — but no screen ever called either. The backend, the route, the API
 * helper and the documentation all described a feature that could not be reached. It is
 * available here now, per resident, because a transfer is a property of a BED, not of the room.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hostelApi } from '../../../../../../services/api';
import BedsSection from './components/BedsSection';
import RoomHistorySection from './components/RoomHistorySection';
import { rupees, statusStyle, allocationBlocker, blockColor, initials } from './roomMeta';

export default function RoomDetail({ roomId, onBack }) {
  const [room, setRoom] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAllocate, setShowAllocate] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [transferFor, setTransferFor] = useState(null); // the bed being moved out
  const [targetRoom, setTargetRoom] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const detail = await hostelApi.roomDetail(roomId);
      setRoom(detail);
      // History is a separate read because it is unbounded; a failure here must not blank the
      // room itself, so it degrades to "no history" rather than to an error screen.
      try {
        setHistory(await hostelApi.roomHistory(roomId));
      } catch {
        setHistory(null);
      }
    } catch (e) {
      setError(e.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const allocate = async () => {
    const value = rollNo.trim();
    if (!value) {
      Alert.alert('Incomplete', 'Enter the student roll number.');
      return;
    }
    setBusy(true);
    try {
      const res = await hostelApi.allocate(value.toUpperCase(), room.number);
      setRollNo('');
      setShowAllocate(false);
      Alert.alert(
        'Allocated',
        `${res.student} allotted bed ${res.bedLabel}.` +
          (res.duesRaisedFor?.length ? ` Rent raised for ${res.duesRaisedFor.join(' and ')}.` : ''),
      );
      await load();
    } catch (e) {
      Alert.alert('Cannot allocate', e.message);
    } finally {
      setBusy(false);
    }
  };

  const vacate = (bed) => {
    Alert.alert(
      'Vacate bed',
      `Check ${bed.occupant.name} out of bed ${bed.bedNo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Vacate',
          style: 'destructive',
          onPress: async () => {
            try {
              await hostelApi.vacateBed(bed.id);
              // Dues stay in the ledger. Checkout is a bed state change, not a debt
              // write-off, and forgiving what a resident owes on the way out is not
              // something a button should do.
              Alert.alert(
                'Checked out',
                `${bed.occupant.name} has been vacated. Any outstanding rent dues remain on record.`,
              );
              await load();
            } catch (e) {
              Alert.alert('Cannot vacate', e.message);
            }
          },
        },
      ],
    );
  };

  const transfer = async () => {
    const value = targetRoom.trim();
    if (!value) {
      Alert.alert('Incomplete', 'Enter the room number to move them into.');
      return;
    }
    setBusy(true);
    try {
      const res = await hostelApi.transferBed(transferFor.id, value.toUpperCase());
      setTransferFor(null);
      setTargetRoom('');
      Alert.alert('Transferred', `${res.student} moved from ${res.from} to bed ${res.bedLabel}.`);
      await load();
    } catch (e) {
      Alert.alert('Cannot transfer', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !room) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading room…</Text>
      </View>
    );
  }

  if (error && !room) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={30} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>Back to rooms</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!room) return null;

  const st = statusStyle(room.status);
  const color = blockColor(room.block);
  const blocker = allocationBlocker(room);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(room.number)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomId}>{room.number}</Text>
              <Text style={styles.roomSub}>
                {room.block} · Floor {room.floor}
              </Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{room.occupied}</Text>
              <Text style={styles.heroStatLabel}>Occupied</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{room.vacant}</Text>
              <Text style={styles.heroStatLabel}>Vacant</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{room.maintenanceBeds}</Text>
              <Text style={styles.heroStatLabel}>In repair</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{rupees(room.rentPerMonth)}</Text>
              <Text style={styles.heroStatLabel}>Rent / month</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Allocate. Disabled with a STATED reason when there is no headroom — a greyed-out
            button with no explanation is the worst of both. */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary, blocker && styles.actionDisabled]}
            onPress={() => setShowAllocate((s) => !s)}
            disabled={!!blocker}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.actionPrimaryText}>
              {showAllocate ? 'Cancel' : 'Allocate resident'}
            </Text>
          </TouchableOpacity>
        </View>
        {blocker && <Text style={styles.blocker}>{blocker}</Text>}

        {showAllocate && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Allocate a bed in {room.number}</Text>
            <Text style={styles.formLabel}>Student roll number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CSE-23-005"
              autoCapitalize="characters"
              value={rollNo}
              onChangeText={setRollNo}
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.formHint}>
              The lowest-numbered available bed is assigned automatically and rent dues are
              raised for this month and next. Beds under repair are skipped.
            </Text>
            <TouchableOpacity
              style={[styles.confirmBtn, busy && { opacity: 0.6 }]}
              onPress={allocate}
              disabled={busy}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.confirmText}>{busy ? 'Allocating…' : 'Confirm allocation'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <BedsSection room={room} blockName={room.block} onChanged={load} />

        {history === null ? (
          <View style={styles.historyError}>
            <Text style={styles.muted}>Room history could not be loaded.</Text>
          </View>
        ) : (
          <RoomHistorySection history={history} blockName={room.block} />
        )}

        {/* Per-resident actions live here because a transfer or a checkout is a property of a
            BED, not of the room as a whole. */}
        {room.beds.some((b) => b.occupant) && (
          <View style={styles.residentActions}>
            <Text style={styles.residentActionsTitle}>Move or check out</Text>
            {room.beds
              .filter((b) => b.occupant)
              .map((b) => (
                <View key={b.id} style={styles.residentActionRow}>
                  <Text style={styles.residentActionWho} numberOfLines={1}>
                    Bed {b.bedNo} · {b.occupant.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.transferBtn}
                    onPress={() => {
                      setTransferFor(b);
                      setTargetRoom('');
                    }}
                  >
                    <Ionicons name="swap-horizontal" size={13} color={theme.colors.primary} />
                    <Text style={styles.transferText}>Transfer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.vacateBtn} onPress={() => vacate(b)}>
                    <Ionicons name="exit-outline" size={13} color="#dc2626" />
                    <Text style={styles.vacateText}>Vacate</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Transfer sheet */}
      {transferFor && (
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                Transfer {transferFor.occupant.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setTransferFor(null);
                  setTargetRoom('');
                }}
              >
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>
              From bed {room.number}-{transferFor.bedNo}. The lowest-numbered available bed in the
              target room is assigned; their existing rent dues carry over.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Target room number, e.g. A-102"
              autoCapitalize="characters"
              value={targetRoom}
              onChangeText={setTargetRoom}
              autoFocus
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setTransferFor(null);
                  setTargetRoom('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, busy && { opacity: 0.6 }]}
                onPress={transfer}
                disabled={busy}
              >
                <Text style={styles.confirmText}>{busy ? 'Moving…' : 'Transfer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  hero: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 18 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  roomId: { fontSize: 22, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  roomSub: { fontSize: 12, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  statusChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontFamily: 'Manrope-Bold' },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  heroStatLabel: {
    fontSize: 9,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  actionPrimary: { backgroundColor: theme.colors.primary },
  actionDisabled: { backgroundColor: '#94a3b8' },
  actionPrimaryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 6 },
  blocker: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: '#d97706',
    paddingHorizontal: 16,
    marginTop: 7,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  formTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  formLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  formHint: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  confirmText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 6 },
  historyError: { paddingHorizontal: 16, marginTop: 20 },
  residentActions: { paddingHorizontal: 16, marginTop: 22 },
  residentActionsTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  residentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  residentActionWho: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginRight: 8,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  transferText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.primary, marginLeft: 4 },
  vacateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vacateText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 4 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text, flex: 1 },
  sheetHint: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 17,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
});