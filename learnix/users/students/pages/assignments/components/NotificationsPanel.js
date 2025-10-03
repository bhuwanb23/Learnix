import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function NotificationsPanel({ notifications, onNotificationPress }) {
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationBackground = (type) => {
    switch (type) {
      case 'warning': return '#FEF3C7';
      case 'info': return '#EFF6FF';
      case 'success': return '#F0FDF4';
      default: return '#F9FAFB';
    }
  };

  const getNotificationBorder = (type) => {
    switch (type) {
      case 'warning': return '#FDE047';
      case 'info': return '#DBEAFE';
      case 'success': return '#BBF7D0';
      default: return '#E5E7EB';
    }
  };

  const getNotificationTextColor = (type) => {
    switch (type) {
      case 'warning': return '#92400E';
      case 'info': return '#1E40AF';
      case 'success': return '#14532D';
      default: return '#374151';
    }
  };

  const getNotificationMessageColor = (type) => {
    switch (type) {
      case 'warning': return '#B45309';
      case 'info': return '#1D4ED8';
      case 'success': return '#15803D';
      default: return '#4B5563';
    }
  };

  const getNotificationTimeColor = (type) => {
    switch (type) {
      case 'warning': return '#D97706';
      case 'info': return '#3B82F6';
      case 'success': return '#16A34A';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <View style={styles.notificationsList}>
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              {
                backgroundColor: getNotificationBackground(notification.type),
                borderColor: getNotificationBorder(notification.type),
              },
            ]}
            onPress={() => onNotificationPress && onNotificationPress(notification)}
            activeOpacity={0.8}
          >
            <View style={styles.notificationContent}>
              <Ionicons
                name={notification.icon}
                size={16}
                color={notification.color}
                style={styles.notificationIcon}
              />
              
              <View style={styles.notificationInfo}>
                <Text style={[
                  styles.notificationTitle,
                  { color: getNotificationTextColor(notification.type) },
                ]}>
                  {notification.title}
                </Text>
                <Text style={[
                  styles.notificationMessage,
                  { color: getNotificationMessageColor(notification.type) },
                ]}>
                  {notification.message}
                </Text>
                <Text style={[
                  styles.notificationTime,
                  { color: getNotificationTimeColor(notification.type) },
                ]}>
                  {formatTimeAgo(notification.time)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  notificationsList: {
    gap: SPACING.sm,
  },
  notificationCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    marginTop: 2,
    marginRight: SPACING.sm,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
});
