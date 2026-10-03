import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import { THEME, procurementMeta, formatDate, formatDateTime } from '../requestMeta';

const CATEGORIES = ['CS', 'MECH', 'CIVIL', 'ECE', 'GENERAL', 'REFERENCE', 'FICTION'];

export default function ProcurementDetail({ navigation, route }) {
  const procurementId = route?.params?.procurementId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null); // 'ORDER' | 'RECEIVE' | 'CANCEL' | null
  const [saving, setSaving] = useState(false);

  // Order form
  const [cost, setCost] = useState('');
  const [copies, setCopies] = useState('');
  const [orderNote, setOrderNote] = useState('');
  // Receive form
  const [category, setCategory] = useState('');
  const [rack, setRack] = useState('');

  const fetchData = useCallback(async () => {
    if (!procurementId) {
      setError('No purchase was selected.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await libraryApi.procurement(procurementId);
      setData(result);
      setCopies(String(result.copies ?? ''));
      setCost(result.costRupees ? String(result.costRupees) : '');
      setCategory(result.category ?? '');
      setRack(result.rackLocation ?? '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [procurementId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const advance = (status) => {
    const payload = { status };
    if (status === 'ORDERED') {
      const c = Number(cost);
      if (cost === '' || Number.isNaN(c) || c < 0) {
        Alert.alert('Cost required', 'Record what the title cost, or enter 0 if it was donated.');
        return;
      }
      payload.costRupees = c;
      if (copies && Number(copies) > 0) payload.copies = Number(copies);
      if (orderNote.trim()) payload.note = orderNote.trim();
    }
    if (status === 'RECEIVED') {
      const n = Number(copies);
      if (!copies || Number.isNaN(n) || n < 1) {
        Alert.alert('Copies required', 'How many copies actually arrived?');
        return;
      }
      payload.copies = n;
      if (category) payload.category = category;
      if (rack.trim()) payload.rackLocation = rack.trim();
      if (orderNote.trim()) payload.note = orderNote.trim();
    }
    if (status === 'CANCELLED') {
      if (orderNote.trim().length < 5) {
        Alert.alert('Reason required', 'Record why this purchase was dropped.');
        return;
      }
      payload.note = orderNote.trim();
    }

    const run = async () => {
      setSaving(true);
      try {
        const result = await libraryApi.advanceProcurement(procurementId, payload);
        setMode(null);
        setOrderNote('');
        await fetchData();

        if (status === 'RECEIVED' && result.book) {
          Alert.alert(
            'Shelved',
            `"${result.book.title}" is now in the catalog with ${result.book.totalCopies} cop${result.book.totalCopies === 1 ? 'y' : 'ies'}.` +
            (result.notifiedStudent ? ` ${result.notifiedStudent} has been told.` : ''),
            [
              {
                text: 'Open catalog',
                onPress: () => navigation.switchTab('Catalog'),
              },
            ],
          );
        } else if (status === 'CANCELLED') {
          Alert.alert('Purchase cancelled', 'Any linked student request has been declined with your reason.');
        } else {
          Alert.alert('Order recorded', 'Mark it received when the copies arrive.');
        }
      } catch (err) {
        Alert.alert('Could Not Update', err.message);
      } finally {
        setSaving(false);
      }
    };

    if (status === 'CANCELLED') {
      Alert.alert(
        'Cancel this purchase?',
        'The linked student request will be declined and cannot be reopened from here.',
        [
          { text: 'Keep it', style: 'cancel' },
          { text: 'Cancel purchase', style: 'destructive', onPress: run },
        ],
      );
    } else {
      run();
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error ?? 'Purchase not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = procurementMeta(data.status);
  const terminal = !data.nextStatus;
  const nextLabel = data.nextStatus ? procurementMeta(data.nextStatus).label : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Headline */}
        <AnimatedCard delay={0} style={styles.block}>
          <Text style={styles.title}>{data.title}</Text>
          {data.author ? <Text style={styles.author}>{data.author}</Text> : null}
          <View style={styles.chipRow}>
            <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <View style={styles.plainChip}>
              <Text style={styles.plainText}>{data.copies} cop{data.copies === 1 ? 'y' : 'ies'}</Text>
            </View>
            {data.costRupees > 0 ? (
              <View style={styles.plainChip}>
                <Text style={styles.plainText}>₹{data.costRupees.toLocaleString()}</Text>
              </View>
            ) : null}
          </View>
          {data.note ? <Text style={styles.headlineNote}>{data.note}</Text> : null}
        </AnimatedCard>

        {/* Timeline */}
        <AnimatedCard delay={60} style={styles.block}>
          <Text style={styles.cardLabel}>Progress</Text>
          {[
            { label: 'Raised', at: data.createdAt, done: true },
            { label: 'Ordered', at: data.orderedAt, done: !!data.orderedAt },
            { label: 'Received & shelved', at: data.receivedAt, done: !!data.receivedAt },
          ].map((step, i) => (
            <View key={step.label} style={styles.timelineRow}>
              <View style={styles.timelineGutter}>
                <View style={[styles.timelineDot, step.done ? styles.timelineDotDone : styles.timelineDotTodo]}>
                  {step.done && <Ionicons name="checkmark" size={10} color="#fff" />}
                </View>
                {i < 2 && <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />}
              </View>
              <View style={styles.timelineBody}>
                <Text style={[styles.timelineLabel, !step.done && styles.timelineLabelTodo]}>{step.label}</Text>
                <Text style={styles.timelineAt}>{step.at ? formatDateTime(step.at) : 'Not yet'}</Text>
              </View>
            </View>
          ))}
          {data.status === 'CANCELLED' ? (
            <View style={styles.cancelledRow}>
              <Ionicons name="ban-outline" size={14} color="#dc2626" />
              <Text style={styles.cancelledText}>This purchase was cancelled.</Text>
            </View>
          ) : null}
        </AnimatedCard>

        {/* Linked request */}
        {data.request ? (
          <AnimatedCard
            delay={120}
            style={styles.block}
            onPress={() => navigation.openModule('RequestDetail', { requestId: data.request.id })}
          >
            <Text style={styles.cardLabel}>Requested by</Text>
            <View style={styles.linkRow}>
              <View style={styles.linkIcon}>
                <Ionicons name="person-outline" size={17} color={THEME} />
              </View>
              <View style={styles.linkBody}>
                <Text style={styles.linkTitle}>{data.request.student}</Text>
                <Text style={styles.linkSub}>
                  {data.request.rollNo}
                  {data.request.reason ? ` · "${data.request.reason}"` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
            {data.request.decisionNote ? (
              <Text style={styles.linkNote}>Decision note: {data.request.decisionNote}</Text>
            ) : null}
          </AnimatedCard>
        ) : null}

        {/* Shelved book */}
        {data.book ? (
          <AnimatedCard
            delay={180}
            style={styles.block}
            onPress={() => navigation.switchTab('Catalog')}
          >
            <Text style={styles.cardLabel}>Now in the catalog</Text>
            <View style={styles.linkRow}>
              <View style={[styles.linkIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="book-outline" size={17} color="#059669" />
              </View>
              <View style={styles.linkBody}>
                <Text style={styles.linkTitle}>{data.book.title}</Text>
                <Text style={styles.linkSub}>
                  {data.book.totalCopies} cop{data.book.totalCopies === 1 ? 'y' : 'ies'} ·{' '}
                  {data.book.availableCopies} on shelf
                  {data.book.rackLocation ? ` · ${data.book.rackLocation}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </View>
          </AnimatedCard>
        ) : null}

        {/* Action */}
        {terminal ? (
          <AnimatedCard delay={220} style={styles.block}>
            <View style={styles.noteRow}>
              <Ionicons name="checkmark-done-outline" size={15} color={data.status === 'CANCELLED' ? '#dc2626' : '#059669'} />
              <Text style={styles.noteText}>
                {data.status === 'CANCELLED'
                  ? 'Cancelled purchases are kept for the record and cannot be reopened.'
                  : 'This purchase is complete — the title is in the catalog.'}
              </Text>
            </View>
          </AnimatedCard>
        ) : (
          <AnimatedCard delay={220} style={[styles.block, styles.actionCard]}>
            {!mode ? (
              <>
                <Text style={styles.actionTitle}>Next: {nextLabel}</Text>
                <Text style={styles.actionHint}>
                  {data.nextStatus === 'ORDERED'
                    ? 'Record the cost and copies so the spend is tracked.'
                    : 'Confirm what arrived. This creates the catalog entry and tells the student.'}
                </Text>
                <View style={styles.actionButtons}>
                  {data.status !== 'ORDERED' ? (
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setMode('CANCEL'); setOrderNote(''); }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="ban-outline" size={15} color="#dc2626" />
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => {
                      setMode(data.nextStatus);
                      setOrderNote('');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="arrow-forward" size={15} color="#fff" />
                    <Text style={styles.primaryText}>{nextLabel}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.actionTitle}>
                  {mode === 'ORDERED' ? 'Record the order' : mode === 'RECEIVED' ? 'Receive into stock' : 'Cancel purchase'}
                </Text>

                {mode !== 'CANCELLED' ? (
                  <View style={styles.fieldRow}>
                    <View style={styles.field}>
                      <Text style={styles.label}>Copies</Text>
                      <TextInput
                        style={styles.input}
                        value={copies}
                        onChangeText={(v) => setCopies(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="1"
                        placeholderTextColor="#cbd5e1"
                      />
                    </View>
                    {mode === 'ORDERED' ? (
                      <View style={styles.field}>
                        <Text style={styles.label}>Cost (₹)</Text>
                        <TextInput
                          style={styles.input}
                          value={cost}
                          onChangeText={(v) => setCost(v.replace(/[^0-9]/g, ''))}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor="#cbd5e1"
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {mode === 'RECEIVED' ? (
                  <>
                    <Text style={styles.label}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      <View style={styles.chipsRow}>
                        {CATEGORIES.map((c) => (
                          <TouchableOpacity
                            key={c}
                            style={[styles.chip, category === c && styles.chipActive]}
                            onPress={() => setCategory(category === c ? '' : c)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <Text style={styles.label}>Rack location</Text>
                    <TextInput
                      style={styles.input}
                      value={rack}
                      onChangeText={setRack}
                      placeholder="e.g. R3-B2"
                      placeholderTextColor="#cbd5e1"
                      maxLength={40}
                    />
                  </>
                ) : null}

                <Text style={[styles.label, mode === 'CANCELLED' && styles.labelDanger]}>
                  {mode === 'CANCELLED' ? 'Reason (required)' : 'Note (optional)'}
                </Text>
                <TextInput
                  style={[styles.textarea, mode === 'CANCELLED' && styles.textareaDanger]}
                  value={orderNote}
                  onChangeText={setOrderNote}
                  multiline
                  placeholder={
                    mode === 'CANCELLED'
                      ? 'Why is this purchase being dropped?'
                      : 'Supplier, expected delivery, anything worth remembering.'
                  }
                  placeholderTextColor="#cbd5e1"
                  maxLength={500}
                />

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setMode(null)} activeOpacity={0.85}>
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, saving && styles.primaryBtnBusy]}
                    onPress={() => advance(mode)}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryText}>
                      {saving
                        ? 'Saving…'
                        : mode === 'ORDERED'
                          ? 'Mark ordered'
                          : mode === 'RECEIVED'
                            ? 'Shelve copies'
                            : 'Cancel purchase'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </AnimatedCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', lineHeight: 24 },
  author: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  plainChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: '#f1f5f9' },
  plainText: { fontSize: 10, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  headlineNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 11 },

  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  timelineRow: { flexDirection: 'row' },
  timelineGutter: { width: 22, alignItems: 'center' },
  timelineDot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: '#059669' },
  timelineDotTodo: { backgroundColor: '#e2e8f0' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  timelineLineDone: { backgroundColor: '#059669' },
  timelineBody: { flex: 1, paddingBottom: 14, paddingLeft: 10 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  timelineLabelTodo: { color: '#94a3b8' },
  timelineAt: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  cancelledText: { fontSize: 11, color: '#dc2626', fontFamily: 'Manrope-SemiBold' },

  linkRow: { flexDirection: 'row', alignItems: 'center' },
  linkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME + '14', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  linkBody: { flex: 1 },
  linkTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  linkSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  linkNote: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 10 },

  actionCard: { padding: 15, backgroundColor: '#fffdf7', borderColor: '#fde68a' },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  actionHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 4 },
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },

  fieldRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  field: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  labelDanger: { color: '#dc2626' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10, fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a', backgroundColor: '#fff' },
  textarea: { minHeight: 76, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 11, padding: 12, fontSize: 13, fontFamily: 'Manrope-Regular', color: '#0f172a', textAlignVertical: 'top', backgroundColor: '#fff' },
  textareaDanger: { borderColor: '#fca5a5' },

  chipsScroll: { flexGrow: 0 },
  chipsRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: THEME, borderColor: THEME },
  chipText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fecaca' },
  cancelText: { fontSize: 13, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, backgroundColor: THEME },
  primaryBtnBusy: { opacity: 0.7 },
  primaryText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  backBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold' },

  noteRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  noteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginLeft: 9 },
});
