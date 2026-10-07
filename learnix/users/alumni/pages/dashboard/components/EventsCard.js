/**
 * Upcoming Events — reunions, webinars, networking.
 *
 * `registered` IS THE POINT OF THIS CARD
 * ---------------------------------------
 * The server sends it per row because "Join" and "You're going" are different actions, and
 * a dashboard that offers to re-register somebody who already holds a seat is worse than
 * one that shows no button at all. The status is read from the caller's OWN registration
 * rows, not a count over all registrations — the same per-user rule the mentorship and
 * giving sections follow.
 *
 * Events are ordered by start date and the server caps the list at three. That cap is
 * deliberate: a dashboard is a glance, and the Events tab is the place to browse properly.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import DashCard, { DashEmpty, Progress } from './DashCard';
import { EMPTY_COPY, SECTIONS, countLabel, fmtDate, relativeDay } from '../dashboardMeta';

const META = SECTIONS.find((s) => s.key === 'events');

/** Event-type chip colours. Keyed by the server's `eventType` taxonomy. */
const TYPE_COLOR = {
  REUNION: '#d97706',
  WEBINAR: '#7c3aed',
  NETWORKING: '#059669',
  WORKSHOP: '#0891b2',
  CAREER: '#2563eb',
  SOCIAL: '#db2777',
};

export default function EventsCard({ events, onOpenEvents, onOpenEvent }) {
  const list = events ?? [];

  return (
    <DashCard
      title={META.title}
      icon={META.icon}
      accent={META.accent}
      actionLabel={list.length > 0 ? 'See all' : undefined}
      onAction={onOpenEvents}
    >
      {list.length === 0 ? (
        <DashEmpty {...EMPTY_COPY.events} accent={META.accent} />
      ) : (
        list.map((e, i) => (
          <EventRow
            key={e.id}
            event={e}
            first={i === 0}
            onPress={onOpenEvent}
            onOpenEvents={onOpenEvents}
          />
        ))
      )}
    </DashCard>
  );
}

function EventRow({ event, first, onPress, onOpenEvents }) {
  const typeColor = TYPE_COLOR[event.eventType] ?? META.accent;
  const when = relativeDay(event.startDate);
  const seatsLeft =
    event.capacity > 0 ? Math.max(0, event.capacity - event.rsvps) : null;
  // Full is computed from capacity alone. A capacity of 0 means "unlimited" in this
  // schema, so treating it as "0 seats left, come quickly" would be a lie.
  const full = event.capacity > 0 && event.rsvps >= event.capacity;
  const pct = event.capacity > 0 ? Math.min(100, (event.rsvps / event.capacity) * 100) : 0;

  return (
    <View style={[styles.row, !first && styles.rowDivided]}>
      <TouchableOpacity
        onPress={() => (onPress ? onPress(event) : onOpenEvents())}
        accessibilityRole="button"
        accessibilityLabel={`${event.title}${event.registered ? ', you are registered' : ''}`}
        style={styles.rowMain}
      >
        <View style={styles.dateBlock}>
          <Text style={[styles.day, { color: typeColor }]}>{fmtDate(event.startDate)?.split(' ')[0]}</Text>
          <Text style={styles.month}>{fmtDate(event.startDate)?.split(' ')[1]}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {event.title}
            </Text>
            {event.registered ? (
              <View style={styles.goingPill}>
                <Ionicons name="checkmark-circle" size={10} color={META.accent} />
                <Text style={styles.goingText}>Going</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {when ? when[0].toUpperCase() + when.slice(1) : ''}
            {event.isOnline ? ' · Online' : event.venue ? ` · ${event.venue}` : ''}
          </Text>

          {event.eventType ? (
            <View style={[styles.typePill, { backgroundColor: `${typeColor}14` }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>
                {event.eventType[0] + event.eventType.slice(1).toLowerCase()}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* The call to action is the card's purpose, so it is a real button rather than
          part of the row press. */}
      <View style={styles.side}>
        {event.registered ? (
          <Text style={styles.sideNote}>See you there</Text>
        ) : (
          <TouchableOpacity
            onPress={() => onOpenEvents()}
            disabled={full}
            accessibilityRole="button"
            accessibilityLabel={full ? `${event.title} is full` : `Register for ${event.title}`}
            style={[
              styles.joinBtn,
              { backgroundColor: full ? theme.colors.surfaceMuted : META.accent },
            ]}
          >
            <Text style={[styles.joinText, full && { color: theme.colors.textLight }]}>
              {full ? 'Full' : 'Join'}
            </Text>
          </TouchableOpacity>
        )}

        {seatsLeft !== null ? (
          <Text style={styles.seats} numberOfLines={1}>
            {full ? 'No seats' : `${seatsLeft} left`}
          </Text>
        ) : null}
        {event.capacity > 0 ? (
          <View style={styles.seatBar}>
            <Progress percent={pct} accent={typeColor} height={3} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateBlock: {
    width: 34,
    alignItems: 'center',
  },
  day: {
    fontSize: 16,
    fontWeight: '800',
  },
  month: {
    fontSize: 9.5,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  body: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  goingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  goingText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: META.accent,
  },
  meta: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  side: {
    alignItems: 'flex-end',
    gap: 3,
    minWidth: 52,
  },
  joinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  joinText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#fff',
  },
  sideNote: {
    fontSize: 9.5,
    color: META.accent,
    fontWeight: '600',
  },
  seats: {
    fontSize: 9,
    color: theme.colors.textLight,
  },
  seatBar: {
    width: 52,
  },
});