import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

export default function NotificationsPanel({ notifications }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

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
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Alerts & Notifications</Text>
        <TouchableOpacity>
          <Text style={styles.markReadButton}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.notificationsList}>
        {notifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            delay={index * 100}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function NotificationItem({ notification, delay = 0 }) {
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, {
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

  return (
    <Animated.View 
      style={[
        styles.notificationCard,
        { 
          backgroundColor: notification.bgColor,
          opacity: opacityAnim,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <Text style={[styles.icon, { color: notification.iconColor }]}>
        {getIconEmoji(notification.icon)}
      </Text>
      <View style={styles.content}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
      </View>
    </Animated.View>
  );
}

function getIconEmoji(iconName) {
  const iconMap = {
    'error': '⚠️',
    'celebration': '🎉',
    'campaign': '📢',
  };
  return iconMap[iconName] || 'ℹ️';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
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
    color: '#2c2f31',
  },
  markReadButton: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0050d4',
  },
  notificationsList: {
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 18,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 11,
    color: '#595c5e',
    lineHeight: 16,
  },
});
