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
                size={20}
                color={activeTab === item.id ? '#2563eb' : 'rgba(255, 255, 255, 0.75)'}
              />
            </Animated.View>
            <Text
              style={[
                styles.label,
                activeTab === item.id && styles.activeLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm + 4,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 20,
    minWidth: 56,
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: '#eff6ff',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  activeLabel: {
    color: '#2563eb',
    fontFamily: 'Manrope-Bold',
  },
});