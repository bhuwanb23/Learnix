import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function NotificationBell({ notifications = [] }) {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderNotification = ({ item }) => (
    <View style={styles.notificationItem}>
      <View style={styles.notificationIcon}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{item.time}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </View>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.bellContainer}
        onPress={() => setShowNotifications(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications" size={20} color={COLORS.textSecondary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowNotifications(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  notificationsList: {
    padding: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  notificationTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginLeft: SPACING.sm,
    alignSelf: 'center',
  },
});
