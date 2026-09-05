import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NOTIFICATION_COLORS } from '../constants/notificationsData';

function getIcon(iconName) {
  const iconMap = {
    error: 'alert-circle',
    celebration: 'trophy',
    calendar: 'calendar',
    campaign: 'megaphone',
    briefcase: 'briefcase',
    notifications: 'notifications',
  };
  return iconMap[iconName] || 'information-circle';
}

export default function NotificationCard({ notification, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, notification.unread && styles.cardUnread]}
      onPress={() => onPress?.(notification)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: notification.bgColor }]}>
        <Ionicons name={getIcon(notification.icon)} size={22} color={notification.iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <View style={styles.timeRow}>
            {notification.unread && <View style={styles.unreadDot} />}
            <Text style={styles.time}>{notification.time}</Text>
          </View>
        </View>
        <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: NOTIFICATION_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
    position: 'relative',
  },
  cardUnread: {
    borderColor: `${NOTIFICATION_COLORS.primary}40`,
    backgroundColor: `${NOTIFICATION_COLORS.primary}08`,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: NOTIFICATION_COLORS.onSurface,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: NOTIFICATION_COLORS.onSurfaceVariant,
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: NOTIFICATION_COLORS.onSurfaceVariant,
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NOTIFICATION_COLORS.primary,
  },
});