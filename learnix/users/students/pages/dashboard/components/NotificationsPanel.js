import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

export default function NotificationsPanel({ notifications, navigation }) {
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
        <TouchableOpacity onPress={() => navigation?.navigate?.('Notifications')} activeOpacity={0.7}>
          <Text style={styles.markReadButton}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.notificationsList}>
        {notifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            delay={index * 100}
            onPress={() => navigation?.navigate?.('Notifications')}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function NotificationItem({ notification, delay = 0, onPress }) {
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
      <TouchableOpacity style={styles.cardTouchable} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.icon, { color: notification.iconColor }]}>
        {getIconEmoji(notification.icon)}
      </Text>
      <View style={styles.content}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
      </View>
      </TouchableOpacity>
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
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  markReadButton: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
  },
  notificationsList: {
    gap: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  cardTouchable: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  notificationMessage: {
    fontSize: 11,
    color: '#595c5e',
    lineHeight: 16,
    fontFamily: 'Manrope-Medium',
  },
});
