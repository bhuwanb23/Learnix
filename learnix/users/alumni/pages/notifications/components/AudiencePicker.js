/**
 * Audience picker for the broadcast composer.
 *
 * Split out of BroadcastComposer because that file had reached 534 lines, and the
 * picker is the part that justifies the split: it is the component that fixes the
 * defect the old screen had, where the audience was one of four literals
 * (`BATCH_2024`, `CITY_BENGALURU`) and a 2019 graduate or a Pune chapter member could
 * not be reached by any broadcast.
 *
 * The year and city lists come from the server and read the real data. The preview
 * runs the SAME resolver the send uses, so the number the office is shown is the
 * number the send produces.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { alumniApi } from '../../../../../services/api';
import { AUDIENCE_KINDS, loadAudienceOptions } from '../notificationsMeta';

export function buildAudience(kind, value, chapterId) {
  switch (kind) {
    case 'GRADUATION_YEAR':
      return { kind, value };
    case 'CHAPTER_CITY':
      return { kind, value: String(value || '').trim() };
    case 'CHAPTER_MEMBERS':
      return { kind, chapterId };
    default:
      return { kind };
  }
}

export default function AudiencePicker({ kind, onChange, audience, onAudienceChange }) {
  const [options, setOptions] = useState({ years: [], cities: [] });
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    loadAudienceOptions().then(setOptions);
  }, []);

  const spec = AUDIENCE_KINDS.find((k) => k.kind === kind);
  const needsValue = spec?.needsValue;

  const valueReady =
    !needsValue ||
    (needsValue === 'number' && audience.value !== '' && audience.value !== undefined) ||
    (needsValue === 'string' && String(audience.value ?? '').trim() !== '') ||
    (needsValue === 'chapter' && Boolean(audience.chapterId));

  const refreshPreview = useCallback(async () => {
    if (!valueReady) {
      setPreview(null);
      return;
    }
    setPreviewing(true);
    try {
      setPreview(await alumniApi.broadcastPreview(audience));
    } catch {
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
    // `audience` is a fresh object each render, so it is intentionally NOT a dep —
    // depending on it would refetch the preview on every keystroke. The three value
    // fields are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, audience.value, audience.chapterId, valueReady]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const missingOptions =
    (needsValue === 'number' && options.years.length === 0) ||
    ((needsValue === 'string' || needsValue === 'chapter') && options.cities.length === 0);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Audience</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {AUDIENCE_KINDS.map((k) => {
          const isActive = k.kind === kind;
          const disabled =
            (k.needsValue === 'number' && options.years.length === 0) ||
            ((k.needsValue === 'string' || k.needsValue === 'chapter') && options.cities.length === 0);
          return (
            <TouchableOpacity
              key={k.kind}
              onPress={() => onChange(k.kind)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled }}
              style={[styles.chip, isActive && styles.chipActive, disabled && styles.chipDisabled]}
            >
              <Ionicons name={k.icon} size={13} color={isActive ? theme.colors.white : theme.colors.textSecondary} />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{k.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {needsValue === 'number' && options.years.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {options.years.map((y) => {
            const isActive = String(audience.value) === String(y.year);
            return (
              <TouchableOpacity
                key={y.year}
                onPress={() => onAudienceChange({ ...audience, value: String(y.year) })}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Class of ${y.year}, ${y.count} people`}
                style={[styles.valueChip, isActive && styles.valueChipActive]}
              >
                <Text style={[styles.valueText, isActive && styles.valueTextActive]}>{y.year}</Text>
                <Text style={[styles.valueCount, isActive && styles.valueCountActive]}>{y.count}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {needsValue === 'string' && options.cities.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {options.cities.map((c) => {
            const isActive = c.city === audience.value;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => onAudienceChange({ ...audience, value: c.city })}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[styles.valueChip, isActive && styles.valueChipActive]}
              >
                <Text style={[styles.valueText, isActive && styles.valueTextActive]}>{c.city}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {needsValue === 'chapter' && options.cities.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {options.cities.map((c) => {
            const isActive = c.id === audience.chapterId;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => onAudienceChange({ ...audience, chapterId: c.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[styles.valueChip, isActive && styles.valueChipActive]}
              >
                <Text style={[styles.valueText, isActive && styles.valueTextActive]}>{c.city} chapter</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {missingOptions ? (
        <Text style={styles.warn}>
          The list of years or chapters could not be loaded, so that audience is unavailable. All
          alumni and active mentors still work.
        </Text>
      ) : (
        <Text style={styles.hint}>{spec?.hint}</Text>
      )}

      <View style={styles.previewRow}>
        {previewing ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Ionicons name="people-outline" size={14} color={theme.colors.textTertiary} />
        )}
        <Text style={styles.previewText}>
          {!valueReady
            ? 'Pick a value to see who this reaches'
            : preview
              ? `Reaches ${preview.reachable} ${preview.reachable === 1 ? 'person' : 'people'}${
                  preview.audienceSize - preview.reachable > 0
                    ? ` · ${preview.audienceSize - preview.reachable} have broadcasts muted`
                    : ''
                }`
              : 'Could not resolve that audience'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chipRow: {
    gap: 7,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  valueChipActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  valueTextActive: {
    color: theme.colors.white,
  },
  valueCount: {
    fontSize: 10,
    color: theme.colors.textLight,
  },
  valueCountActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  warn: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.warning,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  previewText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});