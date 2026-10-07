/**
 * Guardians and emergency contacts.
 *
 * ONE table backs both kinds. They are the same shape with different intent, they are always
 * read together on this screen, and a warden treating them as "people who must be reachable
 * about this student" gains nothing from them being in different places.
 *
 * PRIMARY IS SERVER-SIDDEN, NOT A LOCAL TOGGLE
 * --------------------------------------------
 * The `isPrimary` switch in the form does not try to unset the old primary. Promoting someone
 * here demotes their sibling of the same kind, inside one transaction on the server. Guardian
 * and emergency primaries are INDEPENDENT: making a mother the primary guardian must not
 * un-primary the family doctor, so the two groups are rendered as separate blocks and the
 * backend demotes within a `kind` only.
 *
 * A `@@unique(studentProfileId, kind, isPrimary)` index would have been the tempting fix and
 * it is wrong in a way that looks right — it would also forbid two NON-primary guardians,
 * which is the normal case for a family with more than one.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { hostelApi } from '../../../../../../../services/api';
import { SectionCard, Empty, CONTACT_KINDS } from '../residentMeta';

const BLANK = {
  kind: 'GUARDIAN',
  name: '',
  relation: '',
  phone: '',
  alternatePhone: '',
  email: '',
  isPrimary: false,
};

export default function ContactsSection({ studentProfileId, contacts, onChanged }) {
  const [editing, setEditing] = useState(null); // null | 'new' | a contact row
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const openNew = (kind) => {
    setForm({ ...BLANK, kind });
    setEditing('new');
  };

  const openEdit = (contact) => {
    setForm({
      id: contact.id,
      kind: contact.kind,
      name: contact.name ?? '',
      relation: contact.relation ?? '',
      phone: contact.phone ?? '',
      alternatePhone: contact.alternatePhone ?? '',
      email: contact.email ?? '',
      isPrimary: !!contact.isPrimary,
    });
    setEditing(contact);
  };

  const close = () => {
    setEditing(null);
    setForm(BLANK);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.relation.trim()) {
      // Checked here for a fast, specific message; the server enforces the same three
      // because a client-side check is a courtesy, not a control.
      Alert.alert(
        'Missing details',
        'A contact needs a name, a relation and a phone number.',
      );
      return;
    }
    setBusy(true);
    try {
      await hostelApi.saveResidentContact(studentProfileId, {
        ...(form.id ? { id: form.id } : {}),
        kind: form.kind,
        name: form.name.trim(),
        relation: form.relation.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim() || null,
        email: form.email.trim() || null,
        isPrimary: form.isPrimary,
      });
      close();
      await onChanged();
    } catch (e) {
      Alert.alert('Cannot save contact', e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (contact) => {
    Alert.alert('Remove contact', `Remove ${contact.name} from this resident?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await hostelApi.deleteResidentContact(studentProfileId, contact.id);
            await onChanged();
          } catch (e) {
            Alert.alert('Cannot remove', e.message);
          }
        },
      },
    ]);
  };

  const list = contacts ?? [];

  return (
    <>
      <SectionCard
        title="Contacts"
        action={{ icon: 'person-add-outline', label: 'Add' }}
        onAction={() => openNew('GUARDIAN')}
      >
        {list.length === 0 && (
          <Empty>
            No guardians or emergency contacts on file. Add at least one before the resident
            needs to be reached.
          </Empty>
        )}

        {CONTACT_KINDS.map(({ key, label }) => {
          const group = list.filter((c) => c.kind === key);
          return (
            <View key={key} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupLabel}>{label}</Text>
                <TouchableOpacity
                  style={styles.groupAdd}
                  onPress={() => openNew(key)}
                >
                  <Ionicons name="add" size={12} color={theme.colors.primary} />
                  <Text style={styles.groupAddText}>Add</Text>
                </TouchableOpacity>
              </View>

              {group.length === 0 && <Text style={styles.groupEmpty}>None recorded.</Text>}

              {group.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.contact}
                  onPress={() => openEdit(c)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{c.name}</Text>
                      {c.isPrimary && (
                        <View style={styles.primaryChip}>
                          <Ionicons name="star" size={9} color="#b45309" />
                          <Text style={styles.primaryText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.relation}>
                      {c.relation}
                      {c.alternatePhone ? ` · alt ${c.alternatePhone}` : ''}
                      {c.email ? ` · ${c.email}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </SectionCard>

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={close}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                {form.id ? 'Edit contact' : 'Add contact'}
              </Text>
              <TouchableOpacity onPress={close}>
                <Ionicons name="close" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {form.id ? null : (
                <View style={styles.kindRow}>
                  {CONTACT_KINDS.map((k) => (
                    <TouchableOpacity
                      key={k.key}
                      style={[styles.kindChip, form.kind === k.key && styles.kindChipActive]}
                      onPress={() => setForm((f) => ({ ...f, kind: k.key }))}
                    >
                      <Text
                        style={[styles.kindText, form.kind === k.key && styles.kindTextActive]}
                      >
                        {k.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Field
                label="Name"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Full name"
              />
              {/* Relation is required, not optional: "Father" is the first thing a warden
                  scanning a call sheet reads, and an unlabelled number is worse than none. */}
              <Field
                label="Relation"
                value={form.relation}
                onChange={(v) => setForm((f) => ({ ...f, relation: v }))}
                placeholder="Father, Mother, Uncle…"
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                placeholder="+91…"
                keyboardType="phone-pad"
              />
              <Field
                label="Alternate phone"
                value={form.alternatePhone}
                onChange={(v) => setForm((f) => ({ ...f, alternatePhone: v }))}
                placeholder="Optional"
                keyboardType="phone-pad"
              />
              <Field
                label="Email"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                placeholder="Optional"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.primaryToggle}
                onPress={() => setForm((f) => ({ ...f, isPrimary: !f.isPrimary }))}
              >
                <Ionicons
                  name={form.isPrimary ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={form.isPrimary ? theme.colors.primary : theme.colors.textMuted}
                />
                <Text style={styles.primaryToggleText}>
                  Primary {form.kind === 'EMERGENCY' ? 'emergency contact' : 'guardian'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.hint}>
                Promoting this contact demotes the current primary of the same kind. Guardian
                and emergency primaries are independent.
              </Text>
            </ScrollView>

            <View style={styles.sheetActions}>
              {form.id ? (
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.dangerBtn]}
                  onPress={() => {
                    close();
                    remove({ id: form.id, name: form.name });
                  }}
                >
                  <Text style={[styles.sheetBtnText, { color: '#dc2626' }]}>Remove</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <TouchableOpacity
                style={[styles.sheetBtn, styles.primaryBtn]}
                onPress={save}
                disabled={busy}
              >
                <Text style={styles.sheetBtnText}>{busy ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize = 'words' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 14 },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupAdd: { flexDirection: 'row', alignItems: 'center' },
  groupAddText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
    marginLeft: 2,
  },
  groupEmpty: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  relation: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  primaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 6,
  },
  primaryText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: '#b45309', marginLeft: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 22,
    maxHeight: '88%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  kindRow: { flexDirection: 'row', marginBottom: 12 },
  kindChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  kindChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  kindText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  kindTextActive: { color: '#fff' },
  field: { marginBottom: 10 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  primaryToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  primaryToggleText: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    marginLeft: 8,
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 16,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sheetBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dangerBtn: { backgroundColor: '#fee2e2' },
  primaryBtn: { backgroundColor: theme.colors.primary },
  sheetBtnText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
});