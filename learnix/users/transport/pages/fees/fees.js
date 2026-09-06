import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';

const rupees = (minor) => `₹${(minor / 100).toLocaleString('en-IN')}`;

const STATUS_STYLE = {
  PAID: { bg: '#dcfce7', color: '#059669' },
  PARTIAL: { bg: '#fef3c7', color: '#d97706' },
  UNPAID: { bg: '#fee2e2', color: '#dc2626' },
};

export default function FeesModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [collecting, setCollecting] = useState(null); // due being collected
  const [method, setMethod] = useState('CASH');

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const d = await transportApi.fees();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load fees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const remind = async (due) => {
    try {
      const res = await transportApi.remindFee(due.id);
      Alert.alert('Reminder sent', `${res.student} was notified about the pending fee.`);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const collect = async (due) => {
    try {
      const res = await transportApi.collectFee(due.id, method);
      Alert.alert(
        'Collected',
        `${rupees(res.amountMinor)} received from ${res.student}.\nPayment ${res.referenceNo} · Receipt ${res.receiptNo} issued.`
      );
      setCollecting(null);
      load(false);
    } catch (e) {
      Alert.alert('Action failed', e.message);
    }
  };

  const requestRevision = () => {
    Alert.prompt
      ? null
      : null;
    // simple two-step revision request
    Alert.alert(
      'Request Fee Revision',
      'The transport fee structure is Accounts-owned. Send a revision request to Admin with a reason?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () =>
            transportApi
              .requestFeeRevision(2000000, 'Requested from mobile app — fuel and route cost review')
              .then((res) => Alert.alert('Sent', `Admin notified (${res.notifiedAdmins}). They will review the fee structure.`))
              .catch((e) => Alert.alert('Action failed', e.message)),
        },
      ]
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { stats, dues } = data;
  const perYear = dues.length > 0 ? dues[0].amountMinor : 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{rupees(stats.collectedMinor)}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{rupees(stats.expectedMinor)}</Text>
          <Text style={styles.statLabel}>Expected</Text>
        </View>
        <View style={[styles.statCard, stats.unpaid > 0 && { borderColor: '#fecaca' }]}>
          <Text style={[styles.statValue, stats.unpaid > 0 && { color: '#dc2626' }]}>{stats.unpaid}</Text>
          <Text style={styles.statLabel}>Unpaid</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Collection Rate</Text>
          <Text style={styles.progressPct}>{stats.collectionPct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.collectionPct}%` }]} />
        </View>
      </View>

      <View style={styles.structureCard}>
        <View style={styles.structureBody}>
          <Text style={styles.structureTitle}>Yearly fee per student</Text>
          <Text style={styles.structureValue}>{rupees(perYear)}</Text>
        </View>
        <TouchableOpacity style={styles.revisionBtn} onPress={requestRevision}>
          <Ionicons name="swap-horizontal-outline" size={13} color={theme.colors.primary} />
          <Text style={styles.revisionText}>Request Revision</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Status</Text>
      </View>

      {dues.length === 0 && (
        <Text style={styles.empty}>No fee dues yet — enroll students on routes to generate them.</Text>
      )}
      {dues.map((d) => {
        const st = STATUS_STYLE[d.status] || STATUS_STYLE.UNPAID;
        const open = d.status !== 'PAID';
        return (
          <View key={d.id} style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{d.student.charAt(0)}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.student}>{d.student}</Text>
              <Text style={styles.meta}>
                {d.year} · {rupees(d.amountMinor)}
                {d.paidRef ? ` · ${d.paidRef}` : ''}
              </Text>
            </View>
            {open ? (
              <View style={styles.actionsCol}>
                <TouchableOpacity style={styles.remindBtn} onPress={() => remind(d)}>
                  <Text style={styles.remindText}>Remind</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.collectBtn, collecting === d.id && styles.collectBtnBusy]}
                  onPress={() => {
                    setCollecting(d.id);
                    setMethod('CASH');
                  }}
                >
                  <Text style={styles.collectText}>Collect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{d.status}</Text>
              </View>
            )}
          </View>
        );
      })}

      {collecting && (
        <View style={styles.collectSheet}>
          <Text style={styles.collectTitle}>Collect {rupees(dues.find((d) => d.id === collecting)?.amountMinor || 0)}</Text>
          <Text style={styles.collectSub}>from {dues.find((d) => d.id === collecting)?.student}</Text>
          <View style={styles.methodRow}>
            {['CASH', 'UPI', 'CARD', 'NET_BANKING'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.methodChip, method === m && styles.methodChipActive]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.collectBtnRow}>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setCollecting(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetConfirm}
              onPress={() => collect(dues.find((d) => d.id === collecting))}
            >
              <Text style={styles.sheetConfirmText}>Confirm Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  progressPct: {
    fontSize: 13,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.primary,
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  structureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 12,
  },
  structureBody: { flex: 1 },
  structureTitle: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  structureValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 2,
  },
  revisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  revisionText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 4,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  cardBody: { flex: 1, marginRight: 8 },
  student: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actionsCol: { alignItems: 'flex-end' },
  remindBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginBottom: 6,
  },
  remindText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
  },
  collectBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  collectBtnBusy: { backgroundColor: '#bfdbfe' },
  collectText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  collectSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: 16,
    marginTop: 14,
    marginBottom: 24,
  },
  collectTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  collectSub: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
    marginBottom: 8,
  },
  methodChipActive: { backgroundColor: theme.colors.primary },
  methodText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  methodTextActive: { color: '#fff' },
  collectBtnRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  sheetCancel: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 8,
  },
  sheetCancelText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
  },
  sheetConfirm: {
    flex: 2,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  sheetConfirmText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
});
