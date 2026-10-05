import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { alumniApi } from '../../../../../services/api';
import { SearchBar, SkeletonCard } from '../../../../../components/ui';
import { RequestCard, NoData } from '../../../components/MentorCard';
import { fmtDateTime } from '../../../mentorshipMeta';

/**
 * The requests inbox.
 *
 * Two fixes over the old "Requests" tab:
 *
 * 1. **Decline asks for a reason.** The old Decline button fired immediately with
 *    no confirmation and no explanation, so a mentee whose request was declined
 *    had no idea why. The server requires ≥5 characters for exactly this reason.
 * 2. **Decline shows a spinner.** The old Decline had `disabled={busyId === r.id}`
 *    but never swapped its content for a spinner, so the button looked dead for the
 *    whole round trip and a second tap fired a duplicate request.
 */
export default function MentorshipRequests({ navigation, onDecided, openDirectory }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(null);

  const FILTERS = [
    { id: 'PENDING', label: 'Open' },
    { id: 'ACCEPTED', label: 'Accepted' },
    { id: 'DECLINED', label: 'Declined' },
    { id: 'WITHDRAWN', label: 'Withdrawn' },
  ];

  const load = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError(null);
        setData(await alumniApi.mentorshipRequests({ status }));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status],
  );

  useEffect(() => {
    load();
  }, [load]);

  const requests = (data?.requests ?? []).filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.mentee.name.toLowerCase().includes(q) ||
      (r.requestedSkills ?? '').toLowerCase().includes(q) ||
      (r.message ?? '').toLowerCase().includes(q) ||
      (r.field ?? '').toLowerCase().includes(q)
    );
  });

  const onAccept = async (request) => {
    try {
      setBusyId(request.id);
      const res = await alumniApi.decideMentorshipRequest(request.id, { action: 'accept' });
      Alert.alert('Accepted', `You are now mentoring ${request.mentee.name}.`);
      onDecided?.(res.pairId);
    } catch (e) {
      Alert.alert('Cannot accept', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async () => {
    try {
      setBusyId(declining.id);
      await alumniApi.decideMentorshipRequest(declining.id, { action: 'decline', reason: reason.trim() });
      setDeclining(null);
      setReason('');
      Alert.alert('Declined', `${declining.mentee.name} has been told why.`);
      load(false);
      onDecided?.();
    } catch (e) {
      Alert.alert('Cannot decline', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const onWithdraw = async () => {
    try {
      setBusyId(withdrawing.id);
      await alumniApi.withdrawMentorshipRequest(withdrawing.id);
      setWithdrawing(null);
      Alert.alert('Withdrawn', 'Your request has been withdrawn.');
      load(false);
      onDecided?.();
    } catch (e) {
      Alert.alert('Cannot withdraw', e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mentorship requests</Text>
          <Text style={styles.sub}>{data?.count ?? 0} total</Text>
        </View>
        <TouchableOpacity style={styles.directoryBtn} onPress={openDirectory}>
          <Ionicons name="search-outline" size={16} color="#0891b2" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search mentee or skills…" onSearch={setQuery} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipWrap} contentContainerStyle={styles.chipRow}>
        {FILTERS.map((f) => {
          const active = status === f.id;
          return (
            <TouchableOpacity key={f.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatus(f.id)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={38} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(false);
              }}
            />
          }
        >
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              busy={busyId === r.id}
              onAccept={status === 'PENDING' ? () => onAccept(r) : undefined}
              onDecline={status === 'PENDING' ? () => setDeclining(r) : undefined}
            />
          ))}

          {/* A mentee can withdraw their own open request. */}
          {requests.map((r) =>
            r.status === 'PENDING' && r.isMine ? (
              <TouchableOpacity key={`w-${r.id}`} style={styles.withdrawRow} onPress={() => setWithdrawing(r)}>
                <Ionicons name="close-circle-outline" size={13} color="#94a3b8" />
                <Text style={styles.withdrawText}>Withdraw my request</Text>
              </TouchableOpacity>
            ) : null,
          )}

          {requests.length === 0 ? (
            <NoData
              icon="mail-outline"
              title={status === 'PENDING' ? 'No open requests' : `No ${status.toLowerCase()} requests`}
              subtitle={
                status === 'PENDING'
                  ? 'When someone asks you to mentor them, their request and their reason land here.'
                  : 'Switch tabs to see other states.'
              }
              actionLabel={status === 'PENDING' ? 'Browse mentors' : undefined}
              onAction={status === 'PENDING' ? openDirectory : undefined}
            />
          ) : null}
        </ScrollView>
      )}

      {/* Decline — a reason is mandatory, and the mentor is told what it was. */}
      <Modal visible={!!declining} transparent animationType="slide" onRequestClose={() => setDeclining(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline this request</Text>
              <TouchableOpacity onPress={() => setDeclining(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {declining ? (
              <Text style={styles.declineTarget}>
                {declining.mentee.name} asked for help with {declining.requestedSkills ?? declining.field ?? 'your time'}.
              </Text>
            ) : null}

            <Text style={styles.fieldLabel}>Why (the mentee sees this)</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={reason}
              onChangeText={setReason}
              multiline
              textAlignVertical="top"
              placeholder="I am at capacity this term — please ask again in January."
              placeholderTextColor="#94a3b8"
            />
            <Text style={styles.fieldHint}>
              A decline with no explanation is the commonest way a mentee concludes the programme does not work.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeclining(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#dc2626' }]}
                onPress={onDecline}
                disabled={busy || reason.trim().length < 5}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdraw (own request) */}
      <Modal visible={!!withdrawing} transparent animationType="fade" onRequestClose={() => setWithdrawing(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalTitle}>Withdraw your request?</Text>
            <Text style={styles.confirmText}>
              It will close and the mentor will not be able to accept it. You can ask again later.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setWithdrawing(null)}>
                <Text style={styles.modalCancelText}>Keep it open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#dc2626' }]} onPress={onWithdraw} disabled={!!busyId}>
                <Text style={styles.modalSubmitText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
  retry: { marginTop: 14, backgroundColor: '#0891b2', paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10, alignSelf: 'center' },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 12 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  directoryBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  sub: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  chipWrap: { flexGrow: 0, marginTop: 10 },
  chipRow: { paddingHorizontal: 16, gap: 6 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 6 },
  chipActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 28 },
  withdrawRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  withdrawText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: '#94a3b8' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  confirmCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  declineTarget: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, lineHeight: 18, marginBottom: 4 },
  confirmText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 17, marginTop: 6 },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 12 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  fieldMultiline: { minHeight: 80 },
  fieldHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4, lineHeight: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
