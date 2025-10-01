import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

// Professional notification icons
const UrgentIcon = () => (
  <View style={styles.urgentIcon}>
    <View style={styles.urgentTriangle} />
    <View style={styles.urgentExclamation} />
  </View>
);

const InfoIcon = () => (
  <View style={styles.infoIcon}>
    <View style={styles.infoCircle} />
    <View style={styles.infoDot} />
  </View>
);

const SuccessIcon = () => (
  <View style={styles.successIcon}>
    <View style={styles.successCircle} />
    <View style={styles.successCheck} />
  </View>
);

const getNotificationIcon = (type) => {
  const iconMap = {
    urgent: UrgentIcon,
    info: InfoIcon,
    success: SuccessIcon,
  };
  return iconMap[type] || InfoIcon;
};

export default function NotificationsWidget({ notifications, onNotificationPress }) {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount} New</Text>
          </View>
        )}
      </View>

      <View style={styles.notificationsList}>
        {notifications.map((notification, index) => {
          const IconComponent = getNotificationIcon(notification.type);
          return (
            <NotificationItem
              key={notification.id}
              notification={notification}
              IconComponent={IconComponent}
              onPress={() => onNotificationPress(notification.id)}
              delay={index * 100}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function NotificationItem({ notification, IconComponent, onPress, delay = 0 }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getNotificationStyle = (type) => {
    const styleMap = {
      urgent: {
        container: styles.urgentNotification,
        border: styles.urgentBorder,
      },
      info: {
        container: styles.infoNotification,
        border: styles.infoBorder,
      },
      success: {
        container: styles.successNotification,
        border: styles.successBorder,
      },
    };
    return styleMap[type] || styleMap.info;
  };

  const notificationStyle = getNotificationStyle(notification.type);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
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
            <IconComponent />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  badge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
  },
  notificationsList: {
    gap: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  urgentNotification: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  infoNotification: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  successNotification: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  unreadNotification: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  urgentBorder: {
    backgroundColor: '#ef4444',
  },
  infoBorder: {
    backgroundColor: '#2563eb',
  },
  successBorder: {
    backgroundColor: '#10b981',
  },
  notificationContent: {
    flex: 1,
    marginLeft: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationText: {
    flex: 1,
    marginLeft: 8,
  },
  notificationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  // Icon styles
  urgentIcon: {
    width: 16,
    height: 16,
  },
  urgentTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ef4444',
  },
  urgentExclamation: {
    position: 'absolute',
    top: 3,
    left: 6,
    width: 1.5,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 0.75,
  },
  infoIcon: {
    width: 16,
    height: 16,
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    backgroundColor: 'transparent',
  },
  infoDot: {
    position: 'absolute',
    top: 5,
    left: 6.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#2563eb',
  },
  successIcon: {
    width: 16,
    height: 16,
  },
  successCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  successCheck: {
    position: 'absolute',
    top: 3,
    left: 5,
    width: 4,
    height: 8,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderBottomColor: 'white',
    borderRightColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
});
