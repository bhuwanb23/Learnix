/**
 * Professional links — LinkedIn, GitHub, website.
 *
 * Validated BY SCHEME on the server, not by host. A website field that had to contain
 * `linkedin.com` would reject a perfectly good personal site, and a host allowlist
 * would make the field useless for anybody whose link is a shortener or a country-code
 * domain. What matters is that the stored string is an absolute http(s) URL, because
 * this value is rendered as a pressable link.
 *
 * The three are separate fields rather than one "links" text area because each gets its
 * own icon and label, and because they are gated by one privacy switch
 * (`showLinks`) that can hide all three or none.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { linkMeta } from '../profileMeta';

const FIELDS = [
  { key: 'linkedinUrl', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/you' },
  { key: 'githubUrl', label: 'GitHub', placeholder: 'https://github.com/you' },
  { key: 'websiteUrl', label: 'Website', placeholder: 'https://your-site.com' },
];

export default function LinksSection({ links, saving, onSave, onGoToPrivacy }) {
  const [draft, setDraft] = useState({
    linkedinUrl: links?.linkedinUrl ?? '',
    githubUrl: links?.githubUrl ?? '',
    websiteUrl: links?.websiteUrl ?? '',
  });

  const dirty = FIELDS.some((f) => draft[f.key] !== (links?.[f.key] ?? ''));

  const save = async () => {
    try {
      await onSave(
        Object.fromEntries(FIELDS.map((f) => [f.key, draft[f.key].trim() || null])),
      );
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  return (
    <SectionCard
      title="Professional links"
      icon="link-outline"
      iconColor="#0369a1"
      footer="These are not gated by who can contact you — they are public identifiers. Hide them with the Professional links switch in Privacy."
    >
      {FIELDS.map((f) => {
        const meta = linkMeta(f.key, draft[f.key]);
        const value = draft[f.key] ?? '';
        return (
          <View key={f.key} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: `${meta.color}18` }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
            <View style={styles.body}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                value={value}
                onChangeText={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                accessibilityLabel={`Your ${f.label} URL`}
                style={styles.input}
              />
            </View>
            {value ? (
              <TouchableOpacity
                onPress={() => setDraft((d) => ({ ...d, [f.key]: '' }))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Clear your ${f.label} URL`}
              >
                <Ionicons name="close-circle-outline" size={17} color={theme.colors.textLight} />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}

      {dirty ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() =>
              setDraft({
                linkedinUrl: links?.linkedinUrl ?? '',
                githubUrl: links?.githubUrl ?? '',
                websiteUrl: links?.websiteUrl ?? '',
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Discard link changes"
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save your links"
            style={[styles.saveBtn, saving && styles.busy]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {onGoToPrivacy ? (
        <TouchableOpacity
          onPress={onGoToPrivacy}
          accessibilityRole="button"
          accessibilityLabel="Review your privacy settings"
          style={styles.privacyLink}
        >
          <Ionicons name="eye-outline" size={13} color={theme.colors.primary} />
          <Text style={styles.privacyText}>Review what the directory shows</Text>
        </TouchableOpacity>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12.5,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: theme.spacing.sm,
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
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: theme.spacing.md,
    paddingVertical: 4,
  },
  privacyText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});