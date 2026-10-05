import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { SkeletonCard, EmptyState } from '../../../../../../components/ui';
import { RecurringCard } from '../../components/RecurringCard';
import { CAMPAIGN_CATEGORIES, FUNDS, CADENCES, lookup, fmtDate } from '../../donationsMeta';

/**
 * Standing gifts (recurring contributions).
 *
 * The office-only "Charge due" action is the honest centre of this screen. There
 * is no scheduler in this app, so nothing charges a mandate by itself — which
 * means overdue mandates are surfaced loudly rather than hidden behind an
 * "Active" pill, because the failure mode of this design is somebody forgetting
 * to press the button.
 */
export default function RecurringScreen({ navigation, onChanged, isOffice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [charging, setCharging] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ amountRupees: '', cadence: 'MONTHLY', campaignId: null, fund: 'GENERAL', note: '' });
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async (spinner = true) => {
    try {
      if (spinner) setLoading(true);
      setError(null);
      setData(await alumniApi.recurringGifts());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = async () => {
    setNewOpen(true);
    if (campaigns.length === 0) {
      try {
        const c = await alumniApi.campaigns();
        setCampaigns(c.campaigns ?? []);
      } catch {
        setCampaigns([]);
      }
    }
  };

  const create = async () => {
    const amount = Number(form.amountRupees);
    if (!Number.isInteger(amount) || amount <= 0) {
      Alert.alert('Enter an amount', 'Whole rupees only, greater than zero.');
      return;
    }
    try {
      setSaving(true);
      await alumniApi.createRecurringGift({
        amountRupees: amount,
        cadence: form.cadence,
        campaignId: form.campaignId,
        fund: form.fund,
        note: form.note.trim() || undefined,
      });
      setNewOpen(false);
      setForm({ amountRupees: '', cadence: 'MONTHLY', campaignId: null, fund: 'GENERAL', note: '' });
      Alert.alert('Standing gift set up', 'The office charges each instalment once it falls due.');
      load(false);
    } catch (e) {
      Alert.alert('Cannot set up', e.message);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (mandate, action, why) => {
    try {
      setBusyId(mandate.id);
      await alumniApi.setRecurringGiftStatus(mandate.id, { action, reason: why });
      setCancelling(null);
      setReason('');
      load(false);
      onChanged?.();
    } catch (e) {
      Alert.alert('Cannot change it', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const chargeDue = () => {
    Alert.alert(
      'Charge the due instalments?',
      'Each due standing gift becomes a pledge. The office still confirms each one before a receipt is issued.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Charge them',
          onPress: async () => {
            try {
              setCharging(true);
              const res = await alumniApi.chargeDueRecurringGifts();
              // Skipped mandates are reported, not swallowed: a mandate that cannot
              // charge is the one a donor would otherwise assume is still running.
              Alert.alert(
                `${res.chargedCount} charged`,
                res.skippedCount > 0
                  ? `${res.skippedCount} skipped:\n${res.skipped.map((s) => `· ${s.reason}`).join('\n')}`
                  : 'All due instalments became pledges awaiting confirmation.',
              );
              load(false);
              onChanged?.();
            } catch (e) {
              Alert.alert('Cannot charge', e.message);
            } finally {
              setCharging(false);
            }
          },
        },
      ],
    );
  };

  const mandates = (data?.mandates ?? []).filter((m) => showClosed || m.status === 'ACTIVE' || m.status === 'PAUSED');
  const overdue = (data?.mandates ?? []).filter((m) => m.isOverdue);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Standing gifts</Text>
          <Text style={styles.sub}>{data?.count ?? 0} arrangement(s)</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Overdue is the single most actionable fact on this screen. */}
      {overdue.length > 0 ? (
        <View style={styles.alertBox}>
          <Ionicons name="alert-circle" size={16} color="#b45309" />
          <Text style={styles.alertText}>
            {overdue.length} standing gift{overdue.length === 1 ? ' is' : 's are'} overdue
            {overdue[0].daysOverdue > 0 ? ` — the oldest by ${overdue[0].daysOverdue} days` : ''}.
          </Text>
        </View>
      ) : null}

      {isOffice && (data?.dueNow ?? 0) > 0 ? (
        <TouchableOpacity style={styles.chargeBtn} onPress={chargeDue} disabled={charging}>
          {charging ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={15} color="#fff" />
              <Text style={styles.chargeText}>Charge {data.dueNow} due instalment(s)</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.filterBtn} onPress={() => setShowClosed((v) => !v)}>
        <Ionicons name={showClosed ? 'eye-outline' : 'eye-off-outline'} size={12} color={theme.colors.textMuted} />
        <Text style={styles.filterText}>{showClosed ? 'Showing all, including cancelled' : 'Showing active and paused'}</Text>
      </TouchableOpacity>

      {loading && !data ? (
        <View style={{ paddingHorizontal: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
        >
          {mandates.map((m) => (
            <RecurringCard
              key={m.id}
              mandate={m}
              showDonor={isOffice}
              busy={busyId === m.id}
              onPause={() => setStatus(m, 'pause')}
              onResume={() => setStatus(m, 'resume')}
              onCancel={() => { setCancelling(m); setReason(''); }}
            />
          ))}

          {mandates.length === 0 ? (
            <EmptyState
              icon="repeat-outline"
              title="No standing gifts"
              subtitle="Set one up and the office charges each instalment when it falls due — no card is charged automatically."
              actionLabel="Set up a standing gift"
              onAction={openNew}
              color="#7c3aed"
            />
          ) : null}
        </ScrollView>
      )}

      {/* New standing gift */}
      <Modal visible={newOpen} transparent animationType="slide" onRequestClose={() => setNewOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set up a standing gift</Text>
              <TouchableOpacity onPress={() => setNewOpen(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Amount per instalment (₹)</Text>
            <TextInput
              style={styles.field}
              value={form.amountRupees}
              onChangeText={(t) => setForm((s) => ({ ...s, amountRupees: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="5000"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>How often</Text>
            <View style={styles.chipWrap}>
              {CADENCES.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.chip, form.cadence === c.id && styles.chipActive]} onPress={() => setForm((s) => ({ ...s, cadence: c.id }))}>
                  <Text style={[styles.chipText, form.cadence === c.id && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Towards</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, form.campaignId === null && styles.chipActive]} onPress={() => setForm((s) => ({ ...s, campaignId: null }))}>
                <Text style={[styles.chipText, form.campaignId === null && styles.chipTextActive]}>Unrestricted</Text>
              </TouchableOpacity>
              {campaigns.filter((c) => c.isOpen).map((c) => (
                <TouchableOpacity key={c.id} style={[styles.chip, form.campaignId === c.id && styles.chipActive]} onPress={() => setForm((s) => ({ ...s, campaignId: c.id }))}>
                  <Text style={[styles.chipText, form.campaignId === c.id && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Fund</Text>
            <View style={styles.chipWrap}>
              {FUNDS.map((f) => (
                <TouchableOpacity key={f.id} style={[styles.chip, form.fund === f.id && styles.chipActive]} onPress={() => setForm((s) => ({ ...s, fund: f.id }))}>
                  <Ionicons name={f.icon} size={10} color={form.fund === f.id ? '#fff' : theme.colors.textMuted} />
                  <Text style={[styles.chipText, form.fund === f.id && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.hintBox}>
              This records an intention. Nothing is charged automatically — the office creates each pledge when the
              instalment falls due, and confirms the money before a receipt is issued.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setNewOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={create} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Set up</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cancel — a reason is mandatory, so the donor's decision is on the record */}
      <Modal visible={!!cancelling} transparent animationType="slide" onRequestClose={() => setCancelling(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel this standing gift?</Text>
              <TouchableOpacity onPress={() => setCancelling(null)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {cancelling ? (
              <Text style={styles.cancelTarget}>
                ₹{cancelling.amountRupees.toLocaleString('en-IN')} {cancelling.cadenceLabel.toLowerCase()}, next due {fmtDate(cancelling.nextDueAt)}. This cannot be undone — start a new one instead.
              </Text>
            ) : null}

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.field, styles.fieldMultiline]}
              value={reason}
              onChangeText={setReason}
              multiline
              textAlignVertical="top"
              placeholder="e.g. I am graduating this term."
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCancelling(null)}>
                <Text style={styles.modalCancelText}>Keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#dc2626' }]}
                onPress={() => setStatus(cancelling, 'cancel', reason.trim())}
                disabled={reason.trim().length < 5}
              >
                <Text style={styles.modalSubmitText}>Cancel it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
