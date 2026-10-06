/**
 * Personal information.
 *
 * NAME AND PHONE ARE READ-ONLY HERE, and that is a decision rather than an omission.
 *
 * `email` is the login identity and `fullName` is stamped onto audit rows, mentorship
 * decisions, donation receipts and every achievement verification. Making either
 * editable from a profile form would mean one graduate appearing under two names in
 * the same ledger, and an audit trail whose actor column cannot be trusted. Changing
 * either belongs with the registrar or with the office, not with a text input.
 *
 * So the honest thing is to SHOW them, say they are managed elsewhere, and not pretend
 * with a disabled field that looks editable.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { initialsOf } from '../profileMeta';

function Row({ label, value, editable, onChange, onSave, saving, placeholder, keyboardType, multiline }) {
  const [draft, setDraft] = useState(value ?? '');
  const dirty = editable && draft !== (value ?? '');

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {editable ? (
        <>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textLight}
            keyboardType={keyboardType}
            multiline={multiline}
            maxLength={multiline ? 400 : 120}
            accessibilityLabel={label}
            style={[styles.input, multiline && styles.inputMulti]}
          />
          {dirty ? (
            <View style={styles.rowActions}>
              <TouchableOpacity
                onPress={() => setDraft(value ?? '')}
                accessibilityRole="button"
                accessibilityLabel={`Discard ${label} changes`}
                style={styles.discardBtn}
              >
                <Ionicons name="close" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSave(draft)}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={`Save ${label}`}
                style={[styles.saveBtn, saving && styles.saveBtnBusy]}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.readOnlyValue} numberOfLines={multiline ? 4 : 1}>
          {value || '—'}
        </Text>
      )}
    </View>
  );
}

export default function PersonalSection({ profile, saving, onSave }) {
  const user = profile?.user ?? {};
  const isOffice = (profile?.roles ?? []).includes?.('ALUMNI_OFFICE');

  const saveHeadline = async (v) => {
    try {
      await onSave({ headline: v });
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };
  const saveBio = async (v) => {
    try {
      await onSave({ bio: v });
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };
  const saveLocation = async (v) => {
    try {
      await onSave({ location: v });
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  return (
    <SectionCard title="Personal information" icon="person-outline">
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user.fullName)}</Text>
        </View>
        <View style={styles.identityBody}>
          <Text style={styles.name}>{user.fullName || 'Unnamed'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.status && user.status !== 'ACTIVE' ? (
            <Text style={styles.status}>Account {String(user.status).toLowerCase()}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.managedNote}>
        <Ionicons name="lock-closed-outline" size={12} color={theme.colors.textTertiary} />
        <Text style={styles.managedText}>
          Your name and email are your login and appear on audit records, receipts and
          verifications. Contact the office to change either.
        </Text>
      </View>

      {/* Phone is shown read-only. It lives on `users.phone`, not on the profile row, and
          there is no endpoint that writes it — an editable field here would look like it
          saved and quietly do nothing. */}
      <View style={styles.row}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.readOnlyValue}>{user.phone || 'Not set'}</Text>
      </View>

      <Row
        label="Headline"
        value={profile?.headline}
        editable
        saving={saving}
        placeholder="What you do now"
        onSave={saveHeadline}
      />

      <Row
        label="Location"
        value={profile?.location}
        editable
        saving={saving}
        placeholder="City or region"
        onSave={saveLocation}
      />

      <Row
        label="About"
        value={profile?.bio}
        editable
        saving={saving}
        multiline
        placeholder="A short introduction"
        onSave={saveBio}
      />

      <Text style={styles.footnote}>
        Your headline and bio appear in the directory, subject to your privacy settings.
        {isOffice ? ' As an officer you are listed as office contactable.' : ''}
      </Text>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: theme.spacing.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  identityBody: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  email: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  status: {
    fontSize: 11,
    color: theme.colors.warning,
  },
  managedNote: {
    flexDirection: 'row',
    gap: 6,
    padding: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginBottom: theme.spacing.sm,
  },
  managedText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  row: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  inputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  readOnlyValue: {
    fontSize: 13.5,
    color: theme.colors.textPrimary,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  discardBtn: {
    padding: 7,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceHover,
  },
  saveBtn: {
    padding: 7,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  saveBtnBusy: {
    opacity: 0.5,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
});