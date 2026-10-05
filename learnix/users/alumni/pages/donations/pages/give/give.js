import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { SkeletonCard } from '../../../../../../components/ui';
import { FUNDS, METHODS, CADENCES, CADENCE_MONTHS, inr, inrExact, parseAmount } from '../../donationsMeta';

/**
 * Make a gift — one-time or standing.
 *
 * The pledge/confirm split is stated ON the form rather than discovered after the
 * fact. A donor who taps "Give" and gets no receipt needs to know immediately
 * that the office confirms the money, not to conclude the app swallowed it.
 *
 * Anonymity is opt-in, off by default, and its scope is explained inline: the
 * name is hidden from other alumni but retained by the office, because a tax
 * receipt cannot be issued to nobody. Framing that before the tap is the
 * difference between a donor feeling respected and feeling misled.
 */
export default function GiveScreen({ navigation, campaign: presetCampaign }) {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(presetCampaign?.id ?? null);
  const [amount, setAmount] = useState('');
  const [fund, setFund] = useState('GENERAL');
  const [method, setMethod] = useState('UPI');
  const [note, setNote] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const [mode, setMode] = useState('once'); // once | standing
  const [cadence, setCadence] = useState('MONTHLY');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await alumniApi.campaigns();
      const open = (res.campaigns ?? []).filter((c) => c.isOpen);
      setCampaigns(open);
      if (!campaignId && open.length > 0) setCampaignId(open[0].id);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, []);

  const selected = campaigns.find((c) => c.id === campaignId) ?? presetCampaign ?? null;
  const parsed = parseAmount(amount);

  const submit = async () => {
    if (!parsed) {
      Alert.alert('Enter an amount', 'Whole rupees, greater than zero.');
      return;
    }
    try {
      setBusy(true);
      if (mode === 'standing') {
        const res = await alumniApi.createRecurringGift({
          amountRupees: parsed,
          cadence,
          campaignId,
          fund,
          note: note.trim() || undefined,
        });
        setDone({ kind: 'standing', res });
      } else {
        const res = await alumniApi.pledgeDonation({
          amountRupees: parsed,
          campaignId,
          fund: selected ? 'GENERAL' : fund,
          method,
          note: note.trim() || undefined,
          isAnonymous: anonymous,
        });
        setDone({ kind: 'once', res });
      }
    } catch (e) {
      Alert.alert('Cannot record your gift', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}>
            <Ionicons name={done.kind === 'standing' ? 'repeat' : 'checkmark-circle'} size={34} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>
            {done.kind === 'standing' ? 'Standing gift set up' : 'Thank you — your gift is pledged'}
          </Text>
          <Text style={styles.doneBody}>
            {done.kind === 'standing'
              ? `${inrExact(done.res.amountRupees)} ${done.res.cadenceLabel.toLowerCase()}${done.res.campaign ? ` towards ${done.res.campaign.name}` : ''}. The office creates each instalment when it falls due.`
              : `${inrExact(done.res.amountRupees)}${done.res.campaign ? ` towards ${done.res.campaign}` : ` to the ${done.res.fundLabel.toLowerCase()}`}. The office confirms once the money reaches the college, and your receipt appears here.`}
          </Text>
          {done.res.isAnonymous ? (
            <View style={styles.anonNote}>
              <Ionicons name="eye-off" size={13} color="#64748b" />
              <Text style={styles.anonText}>
                Recorded as Anonymous to other alumni. The office keeps your name for the receipt and bank records.
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.doneBtn} onPress={navigation.goBack}>
            <Text style={styles.doneBtnText}>Back to giving</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={18} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Give</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <View style={styles.modeRow}>
          <ModeChip id="once" label="One-time" active={mode === 'once'} onPress={() => setMode('once')} />
          <ModeChip id="standing" label="Standing gift" active={mode === 'standing'} onPress={() => setMode('standing')} />
        </View>

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountBox}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#cbd5e1"
          />
        </View>
        <View style={styles.presetRow}>
          {[1000, 2500, 5000, 10000, 25000, 50000].map((v) => (
            <TouchableOpacity key={v} style={[styles.preset, parsed === v && styles.presetActive]} onPress={() => setAmount(String(v))}>
              <Text style={[styles.presetText, parsed === v && styles.presetTextActive]}>{inr(v, { plain: true })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'standing' ? (
          <>
            <Text style={styles.label}>How often</Text>
            <View style={styles.chipWrap}>
              {CADENCES.map((c) => (
                <TouchableOpacity key={c.id} style={[styles.chip, cadence === c.id && styles.chipActive]} onPress={() => setCadence(c.id)}>
                  <Text style={[styles.chipText, cadence === c.id && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Stated in money the donor recognises: a monthly figure alone does
                not tell them what the arrangement is worth over a year. */}
            {parsed ? <Text style={styles.annualHint}>That is {inr((parsed * 12) / CADENCE_MONTHS[cadence])} a year.</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.label}>How you gave</Text>
            <View style={styles.chipWrap}>
              {METHODS.map((m) => (
                <TouchableOpacity key={m.id} style={[styles.chip, method === m.id && styles.chipActive]} onPress={() => setMethod(m.id)}>
                  <Ionicons name={m.icon} size={11} color={method === m.id ? '#fff' : theme.colors.textMuted} />
                  <Text style={[styles.chipText, method === m.id && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Towards</Text>
        {loading ? (
          <SkeletonCard style={{ marginBottom: 10 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {campaigns.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, campaignId === c.id && styles.chipActive]}
                onPress={() => setCampaignId(campaignId === c.id ? null : c.id)}
              >
                <Text style={[styles.chipText, campaignId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            {campaigns.length === 0 ? (
              <Text style={styles.noCampaigns}>No open campaigns — this will go to the unrestricted fund.</Text>
            ) : null}
          </ScrollView>
        )}

        {selected ? (
          <View style={styles.campaignBox}>
            <Text style={styles.campaignName}>{selected.name}</Text>
            {selected.beneficiary ? <Text style={styles.campaignBenefit}>{selected.beneficiary}</Text> : null}
            <Text style={styles.campaignProgress}>
              {inr(selected.raisedRupees)} of {inr(selected.targetRupees)} · {selected.percent}%
              {selected.daysLeft !== null ? ` · ${selected.daysLeft} days left` : ''}
            </Text>
          </View>
        ) : null}

        {!selected ? (
          <>
            <Text style={styles.label}>Fund</Text>
            <View style={styles.chipWrap}>
              {FUNDS.map((f) => (
                <TouchableOpacity key={f.id} style={[styles.chip, fund === f.id && styles.chipActive]} onPress={() => setFund(f.id)}>
                  <Ionicons name={f.icon} size={10} color={fund === f.id ? '#fff' : theme.colors.textMuted} />
                  <Text style={[styles.chipText, fund === f.id && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Dedication (optional)</Text>
        <TextInput
          style={styles.field}
          value={note}
          onChangeText={setNote}
          multiline
          textAlignVertical="top"
          placeholder="e.g. in memory of my father, Class of 1994"
          placeholderTextColor="#94a3b8"
        />

        {/* Anonymity, with its scope stated before the donor commits to it. */}
        {mode === 'once' ? (
          <TouchableOpacity style={styles.anonRow} onPress={() => setAnonymous((v) => !v)}>
            <View style={[styles.checkbox, anonymous && styles.checkboxOn]}>
              {anonymous ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.anonTitle}>Give anonymously</Text>
              <Text style={styles.anonHint}>
                Your name is hidden from other alumni. The office keeps it — a tax receipt cannot be issued to nobody.
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* The pledge/confirm split, stated up front. */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle-outline" size={14} color="#0891b2" />
          <Text style={styles.noticeText}>
            {mode === 'standing'
              ? 'A standing gift records an intention. Nothing is charged automatically — the office creates each instalment when it falls due and confirms the money before a receipt is issued.'
              : 'This records your commitment. The office confirms the money once it reaches the college, and your receipt becomes available then.'}
          </Text>
        </View>

        <TouchableOpacity style={[styles.submit, !parsed && styles.submitDisabled]} onPress={submit} disabled={busy || !parsed}>
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="heart" size={15} color="#fff" />
              <Text style={styles.submitText}>
                {mode === 'standing' ? 'Set up standing gift' : `Pledge ${parsed ? inrExact(parsed) : ''}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ModeChip({ id, label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.modeChip, active && styles.modeChipActive]} onPress={onPress}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  title: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  list: { padding: 16, paddingBottom: 30 },

  modeRow: { flexDirection: 'row', gap: 7, marginBottom: 16 },
  modeChip: { flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff', paddingVertical: 10 },
  modeChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  modeText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modeTextActive: { color: '#fff' },

  label: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7, marginTop: 16 },
  amountBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#059669', paddingHorizontal: 14 },
  rupee: { fontSize: 22, fontFamily: 'Manrope-ExtraBold', color: '#059669' },
  amountInput: { flex: 1, fontSize: 26, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text, paddingVertical: 10, marginLeft: 4 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  preset: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 6 },
  presetActive: { backgroundColor: '#059669', borderColor: '#059669' },
  presetText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  presetTextActive: { color: '#fff' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  chipTextActive: { color: '#fff' },
  annualHint: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 7 },
  noCampaigns: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, paddingVertical: 6 },

  campaignBox: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12, marginTop: 10 },
  campaignName: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#065f46' },
  campaignBenefit: { fontSize: 10, fontFamily: 'Manrope-Medium', color: '#047857', marginTop: 3, lineHeight: 15 },
  campaignProgress: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: '#059669', marginTop: 6 },

  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 11, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, minHeight: 64, textAlignVertical: 'top' },

  anonRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: 12, marginTop: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#059669', borderColor: '#059669' },
  anonTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  anonHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3, lineHeight: 14 },

  noticeBox: { flexDirection: 'row', gap: 7, backgroundColor: '#ecfeff', borderRadius: 11, padding: 12, marginTop: 14 },
  noticeText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: '#0e7490', lineHeight: 15 },

  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#059669', borderRadius: 13, paddingVertical: 14, marginTop: 16 },
  submitDisabled: { backgroundColor: '#94a3b8' },
  submitText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#fff' },

  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  doneIcon: { width: 66, height: 66, borderRadius: 22, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 17, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text, marginTop: 16, textAlign: 'center' },
  doneBody: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  anonNote: { flexDirection: 'row', gap: 7, backgroundColor: '#f8fafc', borderRadius: 11, padding: 11, marginTop: 14 },
  anonText: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 15 },
  doneBtn: { backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  doneBtnText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});
