/**
 * Current company and designation.
 *
 * Two columns rather than a career entry: `AlumniProfile.currentRole` and
 * `companyId` are what the directory card shows, and they must be answerable without
 * reading the timeline. The career section is the fuller history; this is the headline
 * fact about where you are now.
 *
 * The company picker is a filtered list of the employers already registered with this
 * institution, so the directory can render a name instead of a raw id. Typing a free
 * name is not offered here — that belongs on a career entry, where `employerLabel`
 * exists precisely for employers the companies table has never heard of. Having both
 * routes in two places is how the same employer ends up registered twice.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';

export default function WorkSection({ profile, saving, onSave, loadCompanies }) {
  const [role, setRole] = useState(profile?.currentRole ?? '');
  const [companyId, setCompanyId] = useState(profile?.company?.id ?? null);
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCompanies()
      .then((list) => {
        if (alive) setCompanies(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (alive) setCompanies([]);
      });
    return () => {
      alive = false;
    };
    // Only on mount: the list is institution-wide and does not change while the screen
    // is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleDirty = role !== (profile?.currentRole ?? '');
  const companyDirty = companyId !== (profile?.company?.id ?? null);
  const dirty = roleDirty || companyDirty;

  const selected = companies.find((c) => c.id === companyId);
  const shown = query.trim()
    ? companies.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : companies.slice(0, 6);

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ currentRole: role.trim() || null, companyId: companyId ?? null });
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Current work" icon="briefcase-outline" iconColor="#0369a1">
      <Text style={styles.fieldLabel}>Designation</Text>
      <TextInput
        value={role}
        onChangeText={setRole}
        placeholder="e.g. Staff Engineer"
        placeholderTextColor={theme.colors.textLight}
        maxLength={120}
        accessibilityLabel="Your designation"
        style={styles.input}
      />

      <Text style={[styles.fieldLabel, styles.spaced]}>Employer</Text>
      {companyId && !selected ? (
        <View style={styles.currentBox}>
          <Text style={styles.currentName}>{profile?.company?.name}</Text>
          {profile?.company?.sector ? <Text style={styles.currentSector}>{profile.company.sector}</Text> : null}
          <TouchableOpacity
            onPress={() => setCompanyId(null)}
            accessibilityRole="button"
            accessibilityLabel="Clear employer"
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={17} color={theme.colors.textLight} />
          </TouchableOpacity>
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search registered employers"
        placeholderTextColor={theme.colors.textLight}
        accessibilityLabel="Search employers"
        style={styles.input}
      />

      {companies.length === 0 ? (
        <Text style={styles.hint}>
          No employers are registered here yet, so you cannot link one. Your career timeline
          still lets you type a free-text employer.
        </Text>
      ) : (
        <View style={styles.picker}>
          {shown.map((c) => {
            const isActive = c.id === companyId;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCompanyId(isActive ? null : c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={c.name}
                style={[styles.option, isActive && styles.optionActive]}
              >
                <View style={styles.optionBody}>
                  <Text style={styles.optionName}>{c.name}</Text>
                  {c.sector ? <Text style={styles.optionSector}>{c.sector}</Text> : null}
                </View>
                {isActive ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </TouchableOpacity>
            );
          })}
          {!shown.length ? <Text style={styles.hint}>No match.</Text> : null}
        </View>
      )}

      {dirty ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => {
              setRole(profile?.currentRole ?? '');
              setCompanyId(profile?.company?.id ?? null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Discard changes"
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={save}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Save your work details"
            style={[styles.saveBtn, busy && styles.busy]}
          >
            <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      </SectionCard>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  spaced: {
    marginTop: theme.spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  currentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginBottom: 7,
  },
  currentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  currentSector: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
  },
  clearBtn: {
    padding: 2,
  },
  picker: {
    marginTop: 7,
    gap: 5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionBody: {
    flex: 1,
  },
  optionName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  optionSector: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
  },
  readOnly: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceHover,
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  saveText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#fff',
  },
  busy: {
    opacity: 0.5,
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
    marginTop: 5,
  },
});