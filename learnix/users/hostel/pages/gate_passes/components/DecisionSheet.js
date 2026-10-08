/**
 * The approve / reject / mark-returned sheet.
 *
 * WHY REJECTION REQUIRES A REASON
 * -------------------------------
 * The student is told the pass was refused. "Contact the warden's office" with no reason is not
 * an answer to a request somebody made in good faith, and the server enforces the reason — this
 * sheet checks it up front rather than letting the request fail.
 *
 * WHY VERIFICATION IS A TICK, NOT A SIDE EFFECT
 * --------------------------------------------
 * `verified` defaults to OFF. Approving a pass records who decided; it does not record that
 * anyone looked at the student's face, and conflating the two would make every approved pass
 * claim an identity check that may never have happened. A warden who checked the ID ticks it;
 * a warden approving on the strength of a name on a slip does not — and the inbox shows which.
 *
 * The sheet also handles MARK RETURNED, because returning a student is the other thing a warden
 * does with a pass, and it belongs next to approval rather than behind a second dialog.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { hostelApi } from '../../../../../services/api';
import { fmtDateTime } from '../gatePassMeta';

export default function DecisionSheet({ request, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset per request, so a previous note can never leak into a different student's pass.
  useEffect(() => {
    setNote('');
    setVerified(false);
  }, [request?.pass?.id, request?.decision]);

  if (!request) return null;

  const { pass, decision } = request;
  const isReject = decision === 'REJECTED';
  const isReturn = decision === 'RETURN';

  const submit = async () => {
    if (isReject && !note.trim()) {
      Alert.alert('Reason required', 'Say why this is refused — the student is told this.');
      return;
    }
    setBusy(true);
    try {
      if (isReturn) {
        await hostelApi.gatePassReturn(pass.id);
        Alert.alert('Checked back in', `${pass.student} has been marked as returned.`);
      } else {
        await hostelApi.gatePassDecide(pass.id, decision, { verified, note });
        Alert.alert(
          decision === 'APPROVED' ? 'Approved' : 'Rejected',
          isReject
            ? `${pass.student} has been told their pass was refused.`
            : `${pass.student} has been notified.${verified ? ' ID check recorded.' : ''}`,
        );
      }
      onDone();
    } catch (e) {
      Alert.alert('Could not complete', e.message);
    } finally {
      setBusy(false);
    }
  };

  const title = isReject
    ? 'Reject this pass'
    : isReturn
      ? 'Mark as returned'
      : 'Approve this pass';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* What is being decided, so the warden is not approving from memory. */}
          <View style={styles.summary}>
            <Text style={styles.summaryName}>{pass.student}</Text>
            <Text style={styles.summaryMeta}>
              {pass.rollNo}
              {pass.room ? ` · Room ${pass.room}` : ''}
            </Text>
            <Text style={styles.summaryReason}>{pass.reason}</Text>
            {pass.destination ? <Text style={styles.summaryDest}>{pass.destination}</Text> : null}
            <View style={styles.summaryTimes}>
              <Text style={styles.summaryTime}>Out {fmtDateTime(pass.outAt)}</Text>
              <Text style={styles.summaryTime}>Back {fmtDateTime(pass.expectedInAt)}</Text>
            </View>
            {pass.isEmergency ? (
              <View style={styles.emergencyRow}>
                <Ionicons name="flash" size={12} color="#7c3aed" />
                <Text style={styles.emergencyText}>Marked as an emergency</Text>
              </View>
            ) : null}
          </View>

          {!isReturn && (
            <Text style={styles.label}>{isReject ? 'Reason for refusal' : 'Note (optional)'}</Text>
          )}
          {!isReturn && (
            <TextInput
              style={[styles.input, isReject && styles.inputRequired]}
              placeholder={isReject ? 'e.g. Outside the permitted weekend window' : 'Optional note for the student'}
              value={note}
              onChangeText={setNote}
              multiline={isReject}
              autoFocus={isReject}
            />
          )}

          {!isReject && !isReturn && (
            <>
              <TouchableOpacity
                style={styles.verifyToggle}
                onPress={() => setVerified((v) => !v)}
              >
                <Ionicons
                  name={verified ? 'checkbox' : 'square-outline'}
                  size={19}
                  color={verified ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text style={styles.verifyText}>I checked this student's ID</Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                Recorded separately from your approval. An approved pass with no ID check is
                flagged in the inbox so it can be looked at twice.
              </Text>
            </>
          )}

          {isReturn && (
            <Text style={styles.hint}>
              Stamps the return time as now. A return cannot be recorded without a departure —
              mark the exit first if the student left before the pass was processed.
            </Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, isReject && styles.confirmReject, busy && { opacity: 0.6 }]}
              onPress={submit}
              disabled={busy}
            >
              <Text style={styles.confirmText}>
                {busy ? 'Saving…' : isReject ? 'Reject' : isReturn ? 'Mark returned' : 'Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  summary: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  summaryName: { fontSize: 14, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  summaryMeta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 1 },
  summaryReason: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 7 },
  summaryDest: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  summaryTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryTime: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  emergencyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  emergencyText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#7c3aed', marginLeft: 4 },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
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
    minHeight: 44,
  },
  inputRequired: { borderColor: '#fca5a5' },
  verifyToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  verifyText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text, marginLeft: 9 },
  hint: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 7, lineHeight: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 18 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  confirmBtn: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  confirmReject: { backgroundColor: '#dc2626' },
  confirmText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});