import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { mediaUrl } from '../../../../../services/api';
import {
  typeMeta,
  eventStatusMeta,
  regStatusMeta,
  dateBadge,
  fmtTime,
  fmtDate,
  fillPercent,
  relativeDay,
  initials,
} from '../eventMeta';

/**
 * One event in a list. Used by the directory AND the "My registrations" tab,
 * which is why it reads `myStatus` from the payload rather than deciding it —
 * the server already knows whether this viewer is in.
 */
export default function EventCard({ event, onPress, showMyStatus = true }) {
  const t = typeMeta(event.eventType);
  const st = eventStatusMeta(event.status);
  const badge = dateBadge(event.startDate);
  const fill = fillPercent(event.confirmed, event.capacity);
  const mine = showMyStatus && event.myStatus ? regStatusMeta(event.myStatus) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.dateBlock, { backgroundColor: t.color + '14' }]}>
        <Text style={[styles.dateDay, { color: t.color }]}>{badge.day}</Text>
        <Text style={styles.dateMonth}>{badge.month}</Text>
        <Text style={styles.dateWeekday}>{badge.weekday}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.typeChip, { backgroundColor: t.color + '14' }]}>
            <Ionicons name={t.icon} size={10} color={t.color} />
            <Text style={[styles.typeChipText, { color: t.color }]}>{t.short}</Text>
          </View>
          {event.isOnline ? (
            <View style={styles.onlineChip}>
              <Ionicons name="globe-outline" size={10} color="#0891b2" />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          ) : null}
          {mine ? (
            <View style={[styles.mineChip, { backgroundColor: mine.color + '14' }]}>
              <Ionicons name={mine.icon} size={10} color={mine.color} />
              <Text style={[styles.mineText, { color: mine.color }]}>{mine.label}</Text>
            </View>
          ) : null}
          {event.status === 'CANCELLED' ? (
            <View style={[styles.mineChip, { backgroundColor: '#dc262614' }]}>
              <Text style={[styles.mineText, { color: '#dc2626' }]}>{st.label}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {fmtDate(event.startDate)}
            {fmtTime(event.startDate) ? ` · ${fmtTime(event.startDate)}` : ''}
            {` · ${relativeDay(event.startDate)}`}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name={event.isOnline ? 'globe-outline' : 'location-outline'} size={11} color={theme.colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {event.isOnline ? 'Online event' : (event.venue ?? 'Venue to be announced')}
            {event.chapter ? ` · ${event.chapter.city} chapter` : ''}
          </Text>
        </View>

        {/* Fill bar. For a PAST event this would be meaningless, so it is
            replaced by the real attendance figure instead. */}
        {event.isPast ? (
          <View style={styles.metaRow}>
            <Ionicons name="checkmark-done-outline" size={11} color="#059669" />
            <Text style={styles.meta}>
              {event.checkedIn} attended
              {event.confirmed > 0 ? ` of ${event.confirmed} confirmed` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.fillBlock}>
            <View style={styles.fillTrack}>
              <View style={[styles.fillBar, { width: `${fill}%`, backgroundColor: fill >= 100 ? '#dc2626' : t.color }]} />
            </View>
            <Text style={styles.fillText}>
              {event.confirmed}/{event.capacity} confirmed
              {event.seatsLeft === 0 ? ' · FULL' : ` · ${event.seatsLeft} left`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** Small circular avatar used by the attendee and review lists. */
export function PersonAvatar({ name, size = 34, color = '#0891b2', checkedIn = false }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: color + '18' },
      ]}
    >
      <Text style={[styles.avatarText, { color, fontSize: size * 0.36 }]}>{initials(name)}</Text>
      {checkedIn ? (
        <View style={styles.avatarTick}>
          <Ionicons name="checkmark" size={8} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}

/** Inline photo tile for the memories grid, tolerant of a missing file. */
export function PhotoTile({ photo, size = 96, onPress, onLongPress }) {
  const [broken, setBroken] = React.useState(false);
  return (
    <TouchableOpacity
      style={[styles.photo, { width: size, height: size }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {broken ? (
        <View style={styles.photoFallback}>
          <Ionicons name="image-outline" size={20} color="#94a3b8" />
          <Text style={styles.photoFallbackText}>unavailable</Text>
        </View>
      ) : (
        <Image
          source={{ uri: mediaUrl(photo.url) }}
          style={styles.photoImg}
          resizeMode="cover"
          onError={() => setBroken(true)}
        />
      )}
      {photo.caption ? (
        <View style={styles.photoCaption}>
          <Text style={styles.photoCaptionText} numberOfLines={1}>
            {photo.caption}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

/** Label/value row used across the detail tabs. */
export function Fact({ label, value, valueColor }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

/** Horizontal 0-100 bar with a caption. `null` renders an explicit dash. */
export function Meter({ label, value, color = '#0891b2', hint }) {
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{value === null || value === undefined ? '—' : `${value}%`}</Text>
      </View>
      {value === null || value === undefined ? (
        <Text style={styles.meterHint}>No data yet</Text>
      ) : (
        <>
          <View style={styles.meterTrack}>
            <View style={[styles.meterBar, { width: `${Math.min(100, value)}%`, backgroundColor: color }]} />
          </View>
          {hint ? <Text style={styles.meterHint}>{hint}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  dateBlock: { width: 54, borderRadius: 12, alignItems: 'center', paddingVertical: 8, marginRight: 12 },
  dateDay: { fontSize: 20, fontFamily: 'Manrope-ExtraBold' },
  dateMonth: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  dateWeekday: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeChipText: { fontSize: 8, fontFamily: 'Manrope-Bold' },
  onlineChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#cffafe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  onlineText: { fontSize: 8, fontFamily: 'Manrope-Bold', color: '#0891b2' },
  mineChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mineText: { fontSize: 8, fontFamily: 'Manrope-Bold' },
  title: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  meta: { flex: 1, fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  fillBlock: { marginTop: 6 },
  fillTrack: { height: 5, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden' },
  fillBar: { height: 5, borderRadius: 3 },
  fillText: { fontSize: 9, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted, marginTop: 3 },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Manrope-ExtraBold' },
  avatarTick: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  photo: { borderRadius: 10, overflow: 'hidden', marginRight: 8, marginBottom: 8, backgroundColor: theme.colors.surfaceMuted },
  photoImg: { width: '100%', height: '100%' },
  photoFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { fontSize: 8, fontFamily: 'Manrope-Medium', color: '#94a3b8', marginTop: 3 },
  photoCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', paddingHorizontal: 6, paddingVertical: 3 },
  photoCaptionText: { color: '#fff', fontSize: 8, fontFamily: 'Manrope-SemiBold' },

  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  factLabel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, flex: 1 },
  factValue: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text, textAlign: 'right', flex: 1 },

  meter: { marginBottom: 12 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  meterLabel: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text },
  meterValue: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  meterTrack: { height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceMuted, overflow: 'hidden' },
  meterBar: { height: 6, borderRadius: 3 },
  meterHint: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
});