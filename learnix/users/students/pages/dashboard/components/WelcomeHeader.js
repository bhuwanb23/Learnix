import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';

// Professional bell icon component
const BellIcon = () => (
  <View style={styles.bellIcon}>
    <View style={styles.bellBody} />
    <View style={styles.bellClapper} />
  </View>
);

export default function WelcomeHeader({ user, notificationCount = 3 }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-30)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulse for notification badge
    if (notificationCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
    }
  }, [notificationCount]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
              defaultSource={require('../../../../../assets/icon.png')}
            />
            <View style={styles.avatarBorder} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.subtitle}>{user.greeting}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notificationButton}>
          <View style={styles.bellContainer}>
            <BellIcon />
          </View>
          {notificationCount > 0 && (
            <Animated.View style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.badgeText}>{notificationCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarBorder: {
    position: 'absolute',
    top: -1.5,
    left: -1.5,
    right: -1.5,
    bottom: -1.5,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 1,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
    marginBottom: 1,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  notificationButton: {
    position: 'relative',
    padding: 6,
  },
  bellContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  bellIcon: {
    width: 16,
    height: 16,
  },
  bellBody: {
    width: 12,
    height: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    position: 'relative',
  },
  bellClapper: {
    position: 'absolute',
    bottom: -1.5,
    left: 5.5,
    width: 1.5,
    height: 3,
    backgroundColor: 'white',
    borderRadius: 0.75,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '700',
  },
});
