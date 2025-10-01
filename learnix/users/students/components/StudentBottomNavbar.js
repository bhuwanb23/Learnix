import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

const navigationItems = [
  {
    id: 'Home',
    label: 'Home',
    icon: '🏠',
    description: 'Dashboard, attendance, schedule, AI Study Buddy',
  },
  {
    id: 'Classes',
    label: 'Classes',
    icon: '📖',
    description: 'Lecture notes, syllabus, quizzes, weak-topic alerts',
  },
  {
    id: 'Assignments',
    label: 'Assignments',
    icon: '✏️',
    description: 'Submit work, take quizzes, exam schedule, analytics',
  },
  {
    id: 'Events',
    label: 'Events',
    icon: '🎊',
    description: 'Event registration, RSVPs, hostel info, collaborations',
  },
  {
    id: 'Profile',
    label: 'Profile',
    icon: '👨‍🎓',
    description: 'Personal info, habit tracker, wallet, achievements',
  },
];

export default function StudentBottomNavbar({ activeTab, onTabChange }) {
  const scaleAnimations = useRef(
    navigationItems.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    navigationItems.forEach((item, index) => {
      if (activeTab === item.id) {
        Animated.spring(scaleAnimations[index], {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      } else {
        Animated.spring(scaleAnimations[index], {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    });
  }, [activeTab]);

  return (
    <LinearGradient
      colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
      style={styles.container}
    >
        <View style={styles.navbar}>
          {navigationItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                activeTab === item.id && styles.activeNavItem,
              ]}
              onPress={() => onTabChange(item.id)}
              activeOpacity={0.7}
            >
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: scaleAnimations[index] }] }
                ]}
              >
                <Text
                  style={[
                    styles.icon,
                    activeTab === item.id && styles.activeIcon,
                  ]}
                >
                  {item.icon}
                </Text>
                {activeTab === item.id && (
                  <Animated.View 
                    style={[
                      styles.activeIndicator,
                      {
                        opacity: scaleAnimations[index].interpolate({
                          inputRange: [1, 1.2],
                          outputRange: [0, 1],
                        })
                      }
                    ]} 
                  />
                )}
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    backdropFilter: 'blur(20px)',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    minHeight: 32,
    justifyContent: 'center',
    marginHorizontal: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeNavItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  icon: {
    fontSize: 18,
    opacity: 0.6,
  },
  activeIcon: {
    opacity: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
});
