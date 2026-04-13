import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

const navigationItems = [
  {
    id: 'Home',
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
    description: 'Dashboard, attendance, schedule, AI Study Buddy',
  },
  {
    id: 'Classes',
    label: 'Classes',
    icon: 'book-outline',
    activeIcon: 'book',
    description: 'Lecture notes, syllabus, quizzes, weak-topic alerts',
  },
  {
    id: 'Assignments',
    label: 'Assignments',
    icon: 'create-outline',
    activeIcon: 'create',
    description: 'Submit work, take quizzes, exam schedule, analytics',
  },
  {
    id: 'Events',
    label: 'Events',
    icon: 'calendar-outline',
    activeIcon: 'calendar',
    description: 'Event registration, RSVPs, hostel info, collaborations',
  },
  {
    id: 'Placement',
    label: 'Placement',
    icon: 'briefcase-outline',
    activeIcon: 'briefcase',
    description: 'Job opportunities, placement stats, interview prep',
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
          toValue: 1.1,
          useNativeDriver: true,
          tension: 150,
          friction: 7,
        }).start();
      } else {
        Animated.spring(scaleAnimations[index], {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 7,
        }).start();
      }
    });
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        {navigationItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.navItem,
              activeTab === item.id && styles.activeNavItem,
            ]}
            onPress={() => onTabChange(item.id)}
            activeOpacity={0.8}
          >
            <Animated.View 
              style={[
                styles.iconContainer,
                { transform: [{ scale: scaleAnimations[index] }] }
              ]}
            >
              <Ionicons
                name={activeTab === item.id ? item.activeIcon : item.icon}
                size={18}
                color={activeTab === item.id ? '#2563eb' : 'rgba(255, 255, 255, 0.7)'}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563eb',
    borderTopWidth: 1,
    borderTopColor: '#1d4ed8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingBottom: SPACING.sm + 4,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 20,
    minHeight: 40,
    minWidth: 40,
    justifyContent: 'center',
    marginHorizontal: SPACING.xs,
  },
  activeNavItem: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
