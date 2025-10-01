import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';
import { getStatusColor, getStatusText, getPriceColor, formatDate } from '../constants/eventData';

export default function EventCard({ event, onPress, onJoin }) {
  const getStatusBadgeColor = () => {
    if (event.isLive) return '#EF4444'; // Red for live
    if (event.status === 'upcoming') return '#3B82F6'; // Blue for upcoming
    if (event.status === 'workshop') return '#F59E0B'; // Orange for workshop
    return '#6B7280'; // Gray for others
  };

  const getStatusBadgeText = () => {
    if (event.isLive) return 'LIVE';
    if (event.status === 'workshop') return 'Workshop';
    return formatDate(event.date);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: event.image }} style={styles.image} />
        <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor() }]}>
          <Text style={styles.statusText}>{getStatusBadgeText()}</Text>
        </View>
        {event.duration && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={12} color="#FFFFFF" />
            <Text style={styles.durationText}>{event.duration}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.dateTime}>
            {formatDate(event.date)} • {event.time}
          </Text>
          <View style={[styles.priceBadge, { backgroundColor: getPriceColor(event.price) + '20' }]}>
            <Text style={[styles.priceText, { color: getPriceColor(event.price) }]}>
              {event.price}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.location}>{event.location}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.attendeesContainer}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={12} color="#FFFFFF" />
              </View>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.attendeesText}>
              {event.maxAttendees ? `${event.attendees}/${event.maxAttendees} attending` : `+${event.attendees} attending`}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.joinButton,
              { backgroundColor: event.price === 'Free' ? '#3B82F6' : '#FFFFFF' }
            ]}
            onPress={() => onJoin(event)}
          >
            <Text style={[
              styles.joinButtonText,
              { color: event.price === 'Free' ? '#FFFFFF' : '#3B82F6' }
            ]}>
              {event.price === 'Free' ? 'Join Now' : 'Register'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 128,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#FFFFFF',
  },
  durationBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  durationText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#FFFFFF',
    marginLeft: 2,
  },
  content: {
    padding: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#3B82F6',
  },
  priceBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  priceText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  location: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    flexDirection: 'row',
    marginRight: SPACING.sm,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  attendeesText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  joinButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  joinButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
