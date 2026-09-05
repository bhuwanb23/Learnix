import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../constants/theme';

const navigationItems = [
  { id: 'Dashboard', icon: 'home-outline', activeIcon: 'home' },
  { id: 'Faculty', icon: 'people-outline', activeIcon: 'people' },
  { id: 'Courses', icon: 'book-outline', activeIcon: 'book' },
  { id: 'Students', icon: 'school-outline', activeIcon: 'school' },
  { id: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function HodBottomNavbar({ activeTab, onTabPress }) {
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
            style={[styles.navItem, activeTab === item.id && styles.activeNavItem]}
            onPress={() => onTabPress(item.id)}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[styles.iconContainer, { transform: [{ scale: scaleAnimations[index] }] }]}
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
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeNavItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});