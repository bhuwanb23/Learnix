/**
 * HD-05 — The HOD's Students desk: the pieces the desk draws with.
 * Docs: 11-hod.md §3.4
 *
 * WHY THESE LIVE HERE AND NOT IN THE SCREEN
 * -----------------------------------------
 * A risk chip is drawn on a directory row, on the at-risk list and on the detail's masthead.
 * Three copies of it is three chances for them to disagree about what "at risk" looks like — and
 * the symptom of that disagreement is a directory that says a student is at risk and a detail page
 * that says they are not.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { MUTED, SLATE, riskSignalMeta, toneMeta } from './studentsMeta';
import { styles } from './studentsStyles';

// ── A section ──────────────────────────────────────────────────────────────

/**
 * A titled card.
 *
 * The blurb is part of the section, not decoration: "The five signals, and what they mean" tells
 * the reader what the list under it MEANs.
 */
export function Section({ title, blurb, icon, color, right, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: `${color ?? '#2563eb'}18` }]}>
          <Ionicons name={icon ?? 'ellipse-outline'} size={15} color={color ?? '#2563eb'} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {blurb ? <Text style={styles.sectionBlurb}>{blurb}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

// ── The risk chip ──────────────────────────────────────────────────────────

/** The risk verdict, as a chip. */
export function RiskChip({ state, small }) {
  const meta = state
    ? [
        { id: 'AT_RISK', label: 'At risk', color: '#dc2626' },
        { id: 'WATCH', label: 'Watch', color: '#d97706' },
        { id: 'OK', label: 'On track', color: '#059669' },
        { id: 'UNMEASURED', label: 'Not measured', color: '#94a3b8' },
      ].find((s) => s.id === state)
    : null;
  const color = meta?.color ?? SLATE;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
      <Ionicons
        name={
          state === 'AT_RISK'
            ? 'alert-circle-outline'
            : state === 'WATCH'
              ? 'eye-outline'
              : state === 'OK'
                ? 'checkmark-circle-outline'
                : 'help-circle-outline'
        }
        size={small ? 11 : 13}
        color={color}
      />
      <Text style={[styles.badgeText, { color }]}>{meta?.label ?? state ?? 'Unknown'}</Text>
    </View>
  );
}

// ── The signal chips ───────────────────────────────────────────────────────

/** The signals that are firing, as chips. */
export function SignalChips({ signals, small }) {
  const list = signals ?? [];
  if (list.length === 0) {
    return (
      <View style={[styles.badge, styles.badgeNone]}>
        <Ionicons name="checkmark-circle-outline" size={small ? 11 : 13} color={MUTED} />
        <Text style={[styles.badgeText, { color: MUTED }]}>No signals</Text>
      </View>
    );
  }
  return (
    <View style={styles.signalWrap}>
      {list.map((s: string) => {
        const meta = riskSignalMeta(s);
        const color = meta?.color ?? SLATE;
        return (
          <View key={s} style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Ionicons name={meta?.icon ?? 'alert-circle-outline'} size={small ? 10 : 12} color={color} />
            <Text style={[styles.badgeText, { color }]}>{meta?.label ?? s}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── A stat tile ────────────────────────────────────────────────────────────

/** One number with its label. A clear count is green rather than alarming. */
export function StatTile({ label, value, hint, tone, icon, color, onPress }) {
  const t = toneMeta(tone);
  const body = (
    <View style={[styles.tile, { borderColor: tone ? t.border : theme.colors.border }]}>
      {icon ? (
        <View style={[styles.tileIcon, { backgroundColor: `${color ?? '#2563eb'}18` }]}>
          <Ionicons name={icon} size={15} color={color ?? '#2563eb'} />
        </View>
      ) : null}
      <Text style={[styles.tileValue, tone ? { color: t.color } : null]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity style={styles.flex} onPress={onPress} activeOpacity={0.75}>
      {body}
    </TouchableOpacity>
  );
}

/** A row of stat tiles. */
export function StatRow({ children }) {
  return <View style={styles.statRow}>{children}</View>;
}

// ── A tag ───────────────────────────────────────────────────────────────────

/** A small tag, for a status word. */
export function Tag({ label, color, bg, onPress }) {
  const body = (
    <View style={[styles.tag, { backgroundColor: bg ?? `${color ?? SLATE}18` }]}>
      <Text style={[styles.tagText, { color: color ?? SLATE }]}>{label}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {body}
    </TouchableOpacity>
  );
}

// ── A labelled row ─────────────────────────────────────────────────────────

/** A label and a value, on one line. */
export function DetailRow({ label, value, tone }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

// ── A progress bar ─────────────────────────────────────────────────────────

/** A proportion, as a bar. */
export function ProgressBar({ percent: value, color, label }) {
  const p = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <View style={styles.barWrap}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${p}%`, backgroundColor: color ?? '#2563eb' }]} />
      </View>
      {label ? <Text style={styles.barLabel}>{label}</Text> : null}
    </View>
  );
}

// ── An empty state ─────────────────────────────────────────────────────────

export function StudentsEmpty({ icon = 'file-tray-outline', title, message }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={26} color={MUTED} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
    </View>
  );
}

/** A note strip — the "here is what this number does NOT mean" line. */
export function NoteStrip({ tone = 'info', children }) {
  const color = tone === 'warn' ? '#d97706' : tone === 'bad' ? '#dc2626' : SLATE;
  return (
    <View style={[styles.note, { borderLeftColor: color }]}>
      <Text style={[styles.noteText, { color }]}>{children}</Text>
    </View>
  );
}

// ── A search box ───────────────────────────────────────────────────────────

export function SearchBox({ value, onChangeText, placeholder = 'Search' }) {
  return (
    <View style={styles.searchBox}>
      <Ionicons name="search-outline" size={15} color={MUTED} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.75}>
          <Ionicons name="close-circle" size={15} color={MUTED} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── A row of selectable chips ───────────────────────────────────────────────

export function ChipRow({ options, value, onChange }) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <TouchableOpacity
            key={String(o.id)}
            style={[
              styles.chip,
              active && {
                backgroundColor: `${o.color ?? '#2563eb'}18`,
                borderColor: o.color ?? '#2563eb',
              },
            ]}
            onPress={() => onChange?.(o.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, active ? { color: o.color ?? '#2563eb' } : null]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── A small button ─────────────────────────────────────────────────────────

export function ActionButton({ label, icon, color = '#2563eb', onPress, disabled, filled }) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        filled
          ? { backgroundColor: color, borderColor: color }
          : { borderColor: `${color}66` },
        disabled ? styles.btnDisabled : null,
      ]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.75}
    >
      {icon ? <Ionicons name={icon} size={13} color={filled ? '#fff' : color} /> : null}
      <Text style={[styles.btnText, { color: filled ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** A spinner, for a section that is still loading on its own. */
export function StudentsLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
