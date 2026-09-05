import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NOTIFICATIONS_DATA, NOTIFICATION_COLORS } from './constants/notificationsData';
import NotificationCard from './components/NotificationCard';

export default function NotificationsPage({ navigation }) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const handleNotificationPress = (notification) => {
    setNotifications(
      notifications.map((n) =>
        n.id === notification.id ? { ...n, unread: false } : n
      )
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={NOTIFICATION_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Unread Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up 🎉'}
        </Text>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onPress={handleNotificationPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NOTIFICATION_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: NOTIFICATION_COLORS.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: NOTIFICATION_COLORS.primary,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: NOTIFICATION_COLORS.primary,
  },
  summaryRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: NOTIFICATION_COLORS.onSurfaceVariant,
  },
  listContent: {
    paddingBottom: 40,
  },
});