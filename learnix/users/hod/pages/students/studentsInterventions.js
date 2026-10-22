/**
 * HD-05 — The HOD's Students desk: the interventions.
 * Docs: 11-hod.md §3.4
 *
 * THE SUGGESTION IS NOT THE INTERVENTION
 * ---------------------------------------
 * A suggestion is what the desk BELIEVES — derived from the signals that fired, with the context
 * filled in. An intervention is what the department DID. The suggestion pre-fills the form; the
 * HOD records it; the history is the list of what was done.
 *
 * Conflating the two would mean the history was full of things nobody did.
 *
 * AND EVERY SUGGESTION IS A BUTTON
 * --------------------------------
 * A suggestion card that cannot be acted on is a decoration. So each one opens the record sheet,
 * pre-filled with the kind, the title and the notes the desk derived — and the HOD presses Save.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { ActionButton, NoteStrip, Section, Tag, StudentsEmpty } from './studentsUi';
import { interventionStatusMeta, interventionTypeMeta, timeAgo } from './studentsMeta';

const styles = StyleSheet.create({
  suggestion: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  suggestionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  suggestionMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  suggestionBlurb: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  flex: { flex: 1 },

  history: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  historyBody: { flex: 1 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  historyMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  historyNotes: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 3,
    lineHeight: 15,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#64748b' },
});

// ═══ The suggestions ═══════════════════════════════════════════════════════

/**
 * THE EARLY INTERVENTION SUGGESTIONS.
 */
export function SuggestionPanel({ suggestions, onRecord }) {
  const list = suggestions ?? [];
  return (
    <Section
      title="Early intervention suggestions"
      blurb="What the signals suggest, and the button that records it. A suggestion is what the desk believes; an intervention is what the department does."
      icon="bulb-outline"
      color="#0891b2"
    >
      {list.length === 0 ? (
        <StudentsEmpty
          icon="checkmark-done-outline"
          title="Nothing to suggest"
          message="No signal is firing for this student, so there is nothing to act on."
        />
      ) : (
        list.map((s: any) => (
          <View key={s.type} style={styles.suggestion}>
            <View style={styles.suggestionHead}>
              <View
                style={[
                  styles.suggestionIcon,
                  { backgroundColor: `${s.color ?? '#2563eb'}18` },
                ]}
              >
                <Ionicons
                  name={s.icon ?? 'ellipse-outline'}
                  size={14}
                  color={s.color ?? '#2563eb'}
                />
              </View>
              <View style={styles.flex}>
                <Text style={styles.suggestionTitle}>{s.title}</Text>
                <Text style={styles.suggestionMeta}>{s.label}</Text>
              </View>
            </View>
            <Text style={styles.suggestionBlurb}>{s.notes}</Text>
            <View style={{ marginTop: 8 }}>
              <ActionButton
                label="Record this intervention"
                icon="add-circle-outline"
                color={s.color ?? '#2563eb'}
                onPress={() => onRecord?.(s)}
              />
            </View>
          </View>
        ))
      )}
    </Section>
  );
}

// ═══ The history ═══════════════════════════════════════════════════════════

/**
 * THE INTERVENTION HISTORY.
 *
 * What the department has already tried with this student, and how each one ended.
 */
export function InterventionHistory({ interventions, onAdvance }) {
  const list = interventions ?? [];
  return (
    <Section
      title="Intervention history"
      blurb="What the department has already tried with this student, and where each one stands."
      icon="time-outline"
      color="#64748b"
    >
      {list.length === 0 ? (
        <StudentsEmpty
          icon="document-text-outline"
          title="Nothing recorded"
          message="No intervention has been recorded for this student yet."
        />
      ) : (
        list.map((i: any) => {
          const status = interventionStatusMeta(i.status);
          const type = interventionTypeMeta(i.type);
          const open = i.status === 'PROPOSED' || i.status === 'IN_PROGRESS';
          return (
            <View key={i.id} style={styles.history}>
              <View style={styles.dot} />
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>{i.title}</Text>
                <Text style={styles.historyMeta}>
                  {type?.label ?? i.type} · raised {timeAgo(i.createdAt)}
                  {i.dueAt ? ` · due ${timeAgo(i.dueAt)}` : ''}
                </Text>
                {i.notes ? <Text style={styles.historyNotes}>{i.notes}</Text> : null}
                {open ? (
                  <View style={{ marginTop: 6 }}>
                    <ActionButton
                      label={i.status === 'PROPOSED' ? 'Start it' : 'Mark resolved'}
                      icon="checkmark-circle-outline"
                      color={i.status === 'PROPOSED' ? '#d97706' : '#059669'}
                      onPress={() => onAdvance?.(i)}
                    />
                  </View>
                ) : null}
              </View>
              <Tag
                label={status?.label ?? i.status}
                color={status?.color ?? '#64748b'}
                bg={`${status?.color ?? '#64748b'}18`}
              />
            </View>
          );
        })
      )}
    </Section>
  );
}
