/**
 * HD-06 — The HOD's Courses desk: the sheet frame.
 * Docs: 11-hod.md §3.3
 *
 * THE FRAME EVERY SHEET USES
 * --------------------------
 * The title says what the sheet DOES and the sub-line says what it will NOT do — "A course is
 * created by the Admin" under an edit sheet is the sentence that stops the reader hunting for a
 * create button that is not there.
 *
 * It is its own file because the frame, the field and the three sheets are three different jobs,
 * and the file that holds the three sheets is already long enough.
 */
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../../../../constants/theme';

/**
 * The bottom-sheet frame every sheet here uses.
 */
export function Sheet({ visible, onClose, title, sub, children, footer }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {sub ? <Text style={styles.sheetSub}>{sub}</Text> : null}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyInner}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer}
        </View>
      </View>
    </Modal>
  );
}

/** A labelled text field. */
export function Field({ label, value, onChangeText, placeholder, keyboard }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    maxHeight: '88%',
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  sheetSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  sheetBody: { marginTop: 14 },
  sheetBodyInner: { paddingBottom: 12 },

  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
});
