/**
 * The room's beds, one row each, with their real state.
 *
 * WHY ONE ROW PER BED, RENDERED FROM `beds[]`
 * -------------------------------------------
 * The screen used to render `residents[]` and ignore the `beds[]` array the endpoint returned.
 * Those are two representations of the same facts, and reading only one had a concrete cost: a
 * bed withdrawn for repair is not a resident, so it never appeared at all — it looked exactly
 * like a free bed. `beds[].occupant` is the single source now, so "Vacant · nobody" and
 * "Occupied · Arjun Mehta" cannot disagree.
 *
 * MAINTENANCE IS AN ACTION, NOT A DISPLAY STATE
 * --------------------------------------------
 * A bed can only be withdrawn while VACANT, and only with a reason — both enforced on the
 * server. The buttons are hidden rather than disabled for an occupied bed so the screen does
 * not offer an action that is guaranteed to fail, and so the reason stays visible where the
 * decision is made.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { hostelApi } from '../../../../../../../services/api';
import { SectionCard, Empty, Divider, blockColor } from '../roomMeta';

export default function BedsSection({ room, blockName, onChanged }) {
  const [withdrawing, setWithdrawing] = useState(null); // the bed being withdrawn
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const beds = room.beds ?? [];
  const color = blockColor(blockName);

  const close = () => {
    setWithdrawing(null);
    setNote('');
  };

  const withdraw = async () => {
    if (!note.trim()) {
      Alert.alert('Reason required', 'Say what is being fixed, so the next person knows.');
      return;
    }
    setBusy(true);
    try {
      await hostelApi.setBedMaintenance(withdrawing.id, true, note.trim());
      close();
      await onChanged();
    } catch (e) {
      Alert.alert('Cannot withdraw bed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const returnToService = (bed) => {
    Alert.alert('Return bed to service', `Mark bed ${bed.bedNo} vacant and ready to allocate?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Return to service',
        onPress: async () => {
          try {
            await hostelApi.setBedMaintenance(bed.id, false);
            await onChanged();
          } catch (e) {
            Alert.alert('Cannot return bed', e.message);
          }
        },
      },
    ]);
  };

  return (
    <>
      <SectionCard
        title="Beds"
        subtitle={`${room.occupied} of ${room.capacity} occupied${
          room.maintenanceBeds > 0 ? ` · ${room.maintenanceBeds} under repair` : ''
        }`}
      >
        {beds.length === 0 && <Empty>This room has no beds configured.</Empty>}

        {beds.map((bed, idx) => {
          const isMaintenance = bed.status === 'MAINTENANCE';
          const occupant = bed.occupant;
          return (
            <View key={bed.id}>
              {idx > 0 && <Divider />}
              <View style={styles.row}>
                <View
                  style={[
                    styles.bedDot,
                    bed.status === 'ALLOCATED' && { backgroundColor: color },
                    isMaintenance && styles.bedDotMaintenance,
                  ]}
                />
                <View style={styles.body}>
                  <View style={styles.head}>
                    <Text style={styles.bedLabel}>Bed {bed.bedNo}</Text>
                    <Text
                      style={[
                        styles.state,
                        {
                          color: isMaintenance
                            ? '#6d28d9'
                            : occupant
                              ? theme.colors.textMuted
                              : '#059669',
                        },
                      ]}
                    >
                      {isMaintenance ? 'In repair' : occupant ? 'Occupied' : 'Vacant'}
                    </Text>
                  </View>

                  {occupant ? (
                    <Text style={styles.occupant}>
                      {occupant.name} · {occupant.rollNo}
                    </Text>
                  ) : isMaintenance ? (
                    <Text style={styles.note}>{bed.maintenanceNote || 'No reason recorded'}</Text>
                  ) : (
                    <Text style={styles.free}>Available to allocate</Text>
                  )}

                  {/* Only offered where it can succeed: an occupied bed cannot be withdrawn. */}
                  {isMaintenance ? (
                    <TouchableOpacity style={styles.linkBtn} onPress={() => returnToService(bed)}>
                      <Ionicons name="build-outline" size={12} color={theme.colors.primary} />
                      <Text style={styles.linkText}>Return to service</Text>
                    </TouchableOpacity>
                  ) : !occupant ? (
                    <TouchableOpacity
                      style={styles.linkBtn}
                      onPress={() => {
                        setWithdrawing(bed);
                        setNote('');
                      }}
                    >
                      <Ionicons name="construct-outline" size={12} color={theme.colors.textMuted} />
                      <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>
                        Mark under maintenance
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </SectionCard>

      <Modal visible={!!withdrawing} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Withdraw bed {withdrawing?.bedNo}</Text>
              <TouchableOpacity onPress={close}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetHint}>
              The bed will not accept a new resident until it is returned to service. The reason
              is required, and is cleared automatically when the bed comes back.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ceiling fan replacement"
              value={note}
              onChangeText={setNote}
              autoFocus
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={close}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, busy && { opacity: 0.6 }]}
                onPress={withdraw}
                disabled={busy}
              >
                <Text style={styles.confirmText}>{busy ? 'Saving…' : 'Withdraw'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  bedDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10, marginTop: 4, backgroundColor: '#e5e7eb' },
  bedDotMaintenance: { backgroundColor: '#c4b5fd' },
  body: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bedLabel: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  state: { fontSize: 11, fontFamily: 'Manrope-SemiBold' },
  occupant: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  note: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#6d28d9', marginTop: 2 },
  free: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 7, alignSelf: 'flex-start' },
  linkText: { fontSize: 11, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary, marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  sheetHint: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 17,
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
    marginTop: 12,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16 },
  cancelBtn: { paddingVertical: 9, paddingHorizontal: 14 },
  cancelText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  confirmBtn: { backgroundColor: '#6d28d9', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  confirmText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});