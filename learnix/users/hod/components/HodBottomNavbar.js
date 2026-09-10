import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const navigationItems = [
  { id: 'Dashboard', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { id: 'Faculty', label: 'Faculty', icon: 'people-outline', activeIcon: 'people' },
  { id: 'Courses', label: 'Courses', icon: 'book-outline', activeIcon: 'book' },
  { id: 'Students', label: 'Students', icon: 'school-outline', activeIcon: 'school' },
  { id: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function HodBottomNavbar({ activeTab, onTabPress }) {
  const scaleAnims = useRef(navigationItems.map(() => new Animated.Value(1))).current;
  const pillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const activeIdx = navigationItems.findIndex((i) => i.id === activeTab);
    if (activeIdx < 0) return;
    Animated.spring(pillAnim, { toValue: activeIdx, tension: 200, friction: 18, useNativeDriver: false }).start();
    Animated.sequence([
      Animated.spring(scaleAnims[activeIdx], { toValue: 1.25, tension: 300, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnims[activeIdx], { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
    ]).start();
    navigationItems.forEach((_, i) => {
      if (i !== activeIdx) Animated.spring(scaleAnims[i], { toValue: 0.88, tension: 200, friction: 12, useNativeDriver: true }).start();
    });
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Animated.View style={[styles.pill, {
          width: `${100 / navigationItems.length}%`,
          transform: [{ translateX: pillAnim.interpolate({ inputRange: navigationItems.map((_, i) => i), outputRange: navigationItems.map((_, i) => `${i * 100}%`) }) }],
        }]} />
        {navigationItems.map((item, index) => {
          const isActive = activeTab === item.id;
          return (
            <TouchableOpacity key={item.id} style={styles.navItem} onPress={() => onTabPress(item.id)} activeOpacity={0.7}>
              <Animated.View style={[styles.iconWrap, isActive && styles.iconWrapActive, { transform: [{ scale: scaleAnims[index] }] }]}>
                <Ionicons name={isActive ? item.activeIcon : item.icon} size={20} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
              </Animated.View>
              <Animated.Text style={[styles.label, isActive && styles.labelActive, {
                opacity: pillAnim.interpolate({ inputRange: navigationItems.map((_, i) => i), outputRange: navigationItems.map((_, i) => (i === index ? 1 : 0.5)) }),
              }]}>
                {item.label}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#4f46e5', borderTopWidth: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  navbar: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 4, position: 'relative' },
  pill: { position: 'absolute', top: 0, height: 3, backgroundColor: '#fff', borderRadius: 2 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  label: { fontSize: 10, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  labelActive: { fontFamily: 'Manrope-Bold', color: '#fff' },
});