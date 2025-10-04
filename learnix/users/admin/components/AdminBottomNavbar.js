import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

const navigationItems = [
  {
    id: 'Dashboard',
    label: 'Dashboard',
    icon: 'grid-outline',
    activeIcon: 'grid',
    description: 'Overview, analytics, quick stats',
  },
  {
    id: 'Students',
    label: 'Students',
    icon: 'people-outline',
    activeIcon: 'people',
    description: 'Student management, enrollment',
  },
  {
    id: 'Teachers',
    label: 'Teachers',
    icon: 'school-outline',
    activeIcon: 'school',
    description: 'Faculty management, schedules',
  },
  {
    id: 'Courses',
    label: 'Courses',
    icon: 'book-outline',
    activeIcon: 'book',
    description: 'Course management, curriculum',
  },
  {
    id: 'Reports',
    label: 'Reports',
    icon: 'analytics-outline',
    activeIcon: 'analytics',
    description: 'Reports, analytics, insights',
  },
];

export default function AdminBottomNavbar({ activeTab, onTabChange }) {
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
                color={activeTab === item.id ? '#7c3aed' : 'rgba(255, 255, 255, 0.7)'}
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
    backgroundColor: '#7c3aed',
    borderTopWidth: 1,
    borderTopColor: '#6d28d9',
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
