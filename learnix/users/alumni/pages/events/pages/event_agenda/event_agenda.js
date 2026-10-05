import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { alumniApi } from '../../../../../../services/api';
import { EmptyState } from '../../../../../../components/ui';
import { fmtTime } from '../../eventMeta';

/**
 * Agenda tab — the running order.
 *
 * `agenda[]` carries more than the old string-per-slot model: start/end times,
 * a speaker, a room and a track, all optional. A slot with no time is shown
 * without one rather than being given a fake "TBC", because a schedule that
 * admits what it does not know is more useful than one padded with placeholders.
 *
 * The office can add a slot and tick items off. `isDone` was previously
 * displayed but had no way to be set anywhere in the alumni app.
 */
export default function EventAgenda({ event, reload }) {
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    day: '1',
    item: '',
    startsAt: '',
    speaker: '',
    location: '',
    track: '',
  });

  const vc = event.viewerContext ?? {};
  const agenda = event.agenda ?? [];

  // Group by day so a two-day reunion reads as two days, not one long list.
  const days = agenda.reduce((acc, a) => {
    (acc[a.day] ??= []).push(a);
    return acc;
  }, {});

  const onToggle = async (item) => {
    try {
      setBusy(true);
      await alumniApi.toggleEventScheduleItem(item.id, !item.isDone);
      reload();
    } catch (e) {
      Alert.alert('Cannot update', e.message);
    } finally {
      setBusy(false);
    }
  };

  const onAdd = async () => {
    if (!form.item.trim()) {
      Alert.alert('Check the title', 'Give the agenda item a title.');
      return;
    }
    try {
      setBusy(true);
      await alumniApi.addEventScheduleItem(event.id, {
        day: parseInt(form.day, 10) || 1,
        item: form.item.trim(),
        // A bare "HH:MM" is not a date the server can parse, so a full ISO value
        // is built from the event's own date. Blank means "no time given".
        startsAt: form.startsAt ? `${new Date(event.startDate).toISOString().slice(0, 10)}T${form.startsAt}:00` : undefined,
        speaker: form.speaker || undefined,
        location: form.location || undefined,
        track: form.track || undefined,
      });
      setComposing(false);
      setForm({ day: String(Math.max(...Object.keys(days).map(Number), 1)), item: '', startsAt: '', speaker: '', location: '', track: '' });
      reload();
    } catch (e) {
      Alert.alert('Cannot add', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Running order</Text>
        {vc.canManageAgenda ? (
          <TouchableOpacity onPress={() => setComposing(true)}>
            <Text style={styles.linkAction}>Add slot</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {agenda.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title="No agenda yet"
          subtitle={vc.canManageAgenda ? 'Add the first slot to build the running order.' : 'The organiser has not published an agenda.'}
          color="#2563eb"
        />
      ) : null}

      {Object.keys(days)
        .map(Number)
        .sort((a, b) => a - b)
        .map((day) => (
          <View key={day} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>Day {day}</Text>
              <Text style={styles.dayCount}>{days[day].length} slots</Text>
            </View>

            {days[day]
              .sort((a, b) => a.order - b.order)
              .map((item, i) => (
                <View key={item.id} style={styles.slot}>
                  {/* The rail + dot makes the sequence readable as a sequence,
                      which a flat list of rows does not. */}
                  <View style={styles.rail}>
                    <View
                      style={[
                        styles.dot,
                        item.isDone && styles.dotDone,
                        i === days[day].length - 1 && styles.dotLast,
                      ]}
                    />
                    {i < days[day].length - 1 ? <View style={styles.line} /> : null}
                  </View>

                  <View style={styles.slotBody}>
                    <View style={styles.slotHead}>
                      <Text style={[styles.slotTitle, item.isDone && styles.slotTitleDone]}>
                        {item.item}
                      </Text>
                      {vc.canManageAgenda ? (
                        <TouchableOpacity onPress={() => onToggle(item)} disabled={busy} hitSlop={8}>
                          <Ionicons
                            name={item.isDone ? 'checkmark-circle' : 'ellipse-outline'}
                            size={19}
                            color={item.isDone ? '#059669' : '#cbd5e1'}
                          />
                        </TouchableOpacity>
                      ) : item.isDone ? (
                        <Ionicons name="checkmark-circle" size={17} color="#059669" />
                      ) : null}
                    </View>

                    {item.startsAt ? (
                      <View style={styles.slotMeta}>
                        <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                        <Text style={styles.slotMetaText}>
                          {fmtTime(item.startsAt)}
                          {item.endsAt ? ` – ${fmtTime(item.endsAt)}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {item.speaker ? (
                      <View style={styles.slotMeta}>
                        <Ionicons name="person-outline" size={11} color={theme.colors.textMuted} />
                        <Text style={styles.slotMetaText}>{item.speaker}</Text>
                      </View>
                    ) : null}

                    {item.location ? (
                      <View style={styles.slotMeta}>
                        <Ionicons name="location-outline" size={11} color={theme.colors.textMuted} />
                        <Text style={styles.slotMetaText}>{item.location}</Text>
                      </View>
                    ) : null}

                    {item.track ? (
                      <View style={styles.trackChip}>
                        <Text style={styles.trackText}>{item.track}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
          </View>
        ))}

      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.modalCard} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add agenda slot</Text>
              <TouchableOpacity onPress={() => setComposing(false)}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Day</Text>
            <TextInput
              style={styles.field}
              value={form.day}
              onChangeText={(t) => setForm((f) => ({ ...f, day: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>What happens</Text>
            <TextInput
              style={styles.field}
              value={form.item}
              onChangeText={(t) => setForm((f) => ({ ...f, item: t }))}
              placeholder="Opening keynote"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Start time (optional)</Text>
            <TextInput
              style={styles.field}
              value={form.startsAt}
              onChangeText={(t) => setForm((f) => ({ ...f, startsAt: t }))}
              placeholder="09:30"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Speaker (optional)</Text>
            <TextInput
              style={styles.field}
              value={form.speaker}
              onChangeText={(t) => setForm((f) => ({ ...f, speaker: t }))}
              placeholder="Dr A. Rao"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Room / location (optional)</Text>
            <TextInput
              style={styles.field}
              value={form.location}
              onChangeText={(t) => setForm((f) => ({ ...f, location: t }))}
              placeholder="Seminar Hall 2"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Track (optional)</Text>
            <TextInput
              style={styles.field}
              value={form.track}
              onChangeText={(t) => setForm((f) => ({ ...f, track: t }))}
              placeholder="Technical"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setComposing(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={onAdd} disabled={busy}>
                <Text style={styles.modalSubmitText}>{busy ? 'Adding…' : 'Add slot'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { padding: 16, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerTitle: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  linkAction: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#2563eb' },

  dayBlock: { marginBottom: 14 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayLabel: { fontSize: 11, fontFamily: 'Manrope-ExtraBold', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.6 },
  dayCount: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },

  slot: { flexDirection: 'row' },
  rail: { width: 20, alignItems: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#2563eb', backgroundColor: '#fff', marginTop: 4 },
  dotDone: { backgroundColor: '#059669', borderColor: '#059669' },
  dotLast: { borderColor: '#cbd5e1' },
  line: { flex: 1, width: 2, backgroundColor: theme.colors.border, marginVertical: 2 },
  slotBody: { flex: 1, paddingBottom: 14, paddingLeft: 4 },
  slotHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  slotTitle: { flex: 1, fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  slotTitleDone: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
  slotMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  slotMetaText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  trackChip: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5 },
  trackText: { fontSize: 8, fontFamily: 'Manrope-Bold', color: '#4338ca' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 15, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  fieldLabel: { fontSize: 10, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5, marginTop: 10 },
  field: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  modalSubmit: { flex: 1, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalSubmitText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});