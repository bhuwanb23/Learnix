import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const navigationItems = [
  { id: 'Dashboard', icon: 'home-outline', activeIcon: 'home', label: 'Home' },
  { id: 'Catalog', icon: 'book-outline', activeIcon: 'book', label: 'Catalog' },
  { id: 'Circulation', icon: 'swap-horizontal-outline', activeIcon: 'swap-horizontal', label: 'Circulate' },
  { id: 'Fines', icon: 'cash-outline', activeIcon: 'cash', label: 'Fines' },
  { id: 'Profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
];

const THEME_COLOR = '#b45309';

export default function LibraryBottomNavbar({ activeTab, onTabPress }) {
  const pillX = useRef(new Animated.Value(0)).current;
  const scaleAnimations = useRef(
    navigationItems.map(() => new Animated.Value(1))
  ).current;
  const labelOpacities = useRef(
    navigationItems.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    navigationItems.forEach((item, index) => {
      if (activeTab === item.id) {
        Animated.parallel([
          Animated.spring(scaleAnimations[index], {
            toValue: 1.15,
            useNativeDriver: true,
            tension: 200,
            friction: 10,
          }),
          Animated.timing(labelOpacities[index], {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        Animated.spring(pillX, {
          toValue: index,
          useNativeDriver: false,
          tension: 180,
          friction: 12,
        }).start();
      } else {
        Animated.parallel([
          Animated.spring(scaleAnimations[index], {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 10,
          }),
          Animated.timing(labelOpacities[index], {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        {navigationItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => onTabPress(item.id)}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.iconWrap,
                {
                  transform: [{ scale: scaleAnimations[index] }],
                  backgroundColor:
                    activeTab === item.id
                      ? 'rgba(255,255,255,0.2)'
                      : 'transparent',
                },
              ]}
            >
              <Ionicons
                name={activeTab === item.id ? item.activeIcon : item.icon}
                size={20}
                color={
                  activeTab === item.id ? '#FFFFFF' : 'rgba(255,255,255,0.6)'
                }
              />
            </Animated.View>
            <Animated.Text
              style={[
                styles.label,
                {
                  opacity: labelOpacities[index],
                  color: '#FFFFFF',
                  fontWeight: activeTab === item.id ? '700' : '500',
                },
              ]}
            >
              {item.label}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME_COLOR,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
    minWidth: 56,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    letterSpacing: 0.2,
  },
});
