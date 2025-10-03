import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';
import { formatDateForDisplay } from '../constants/eventData';

export default function EventModal({ event, visible, onClose, onJoin, onShare }) {
  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={() => onShare(event)}>
            <Ionicons name="share-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: event.image }} style={styles.image} />
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {event.isLive ? 'LIVE' : 'Upcoming'}
              </Text>
            </View>
          </View>

          <View style={styles.details}>
            <Text style={styles.title}>{event.title}</Text>
            
            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  {formatDateForDisplay(event.date)} • {event.time}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{event.location}</Text>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{event.duration}</Text>
              </View>
            </View>

            <Text style={styles.description}>{event.description}</Text>

            <View style={styles.tagsContainer}>
              {event.tags?.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.attendeesInfo}>
              <View style={styles.attendeesContainer}>
                <View style={styles.avatarStack}>
                  <View style={styles.avatar} />
                  <View style={[styles.avatar, { marginLeft: -8 }]} />
                  <View style={[styles.avatar, { marginLeft: -8 }]} />
                </View>
                <Text style={styles.attendeesText}>
                  {event.attendees} people attending
                </Text>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.price}>{event.price}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => onJoin(event)}
          >
            <Text style={styles.joinButtonText}>
              {event.price === 'Free' ? 'Join Now' : 'Register'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  shareButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
  },
  details: {
    padding: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  metaInfo: {
    marginBottom: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  metaText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  attendeesInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  attendeesText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  priceContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  price: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#3B82F6',
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  joinButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#FFFFFF',
  },
});
