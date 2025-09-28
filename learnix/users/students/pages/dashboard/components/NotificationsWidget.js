import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../constants/dashboardData';

export default function NotificationsWidget({ notifications, onNotificationPress }) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount} New</Text>
          </View>
        )}
      </View>

      <View style={styles.notificationsList}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onPress={() => onNotificationPress(notification.id)}
          />
        ))}
      </View>
    </View>
  );
}

function NotificationItem({ notification, onPress }) {
  const getNotificationStyle = (type) => {
    const styleMap = {
      urgent: {
        container: styles.urgentNotification,
        border: styles.urgentBorder,
        icon: styles.urgentIcon,
      },
      info: {
        container: styles.infoNotification,
        border: styles.infoBorder,
        icon: styles.infoIcon,
      },
      success: {
        container: styles.successNotification,
        border: styles.successBorder,
        icon: styles.successIcon,
      },
    };
    return styleMap[type] || styleMap.info;
  };

  const notificationStyle = getNotificationStyle(notification.type);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        notificationStyle.container,
        !notification.isRead && styles.unreadNotification,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.leftBorder, notificationStyle.border]} />
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>{notification.icon}</Text>
          <View style={styles.notificationText}>
            <Text style={[
              styles.notificationTitle,
              !notification.isRead && styles.unreadTitle,
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationMessage}>
              {notification.message}
            </Text>
          </View>
        </View>
        
        <Text style={styles.notificationTime}>{notification.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  badge: {
    backgroundColor: COLORS.red[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.red[600],
  },
  notificationsList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
  },
  urgentNotification: {
    backgroundColor: COLORS.red[50],
  },
  infoNotification: {
    backgroundColor: COLORS.blue[50],
  },
  successNotification: {
    backgroundColor: COLORS.green[50],
  },
  unreadNotification: {
    borderWidth: 1,
    borderColor: COLORS.blue[200],
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  urgentBorder: {
    backgroundColor: COLORS.red[400],
  },
  infoBorder: {
    backgroundColor: COLORS.blue[400],
  },
  successBorder: {
    backgroundColor: COLORS.green[400],
  },
  notificationContent: {
    flex: 1,
    marginLeft: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  urgentIcon: {
    color: COLORS.red[500],
  },
  infoIcon: {
    color: COLORS.blue[500],
  },
  successIcon: {
    color: COLORS.green[500],
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 12,
    color: COLORS.gray[600],
    lineHeight: 16,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.gray[400],
    marginTop: 4,
  },
});
