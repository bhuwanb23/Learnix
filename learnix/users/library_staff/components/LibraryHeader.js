import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LibraryHeader({ title, subtitle, onNotificationsPress, showBack, onBackPress, icon }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good Afternoon', emoji: '🌤️' };
    return { text: 'Good Evening', emoji: '🌙' };
  };

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#b45309" />
      <View style={styles.topSection}>
        {showBack ? (
          <View style={styles.backSection}>
            <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
              <View style={styles.backBtnBg}>
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.titleSection}>
              <View style={styles.iconBadge}>
                <Ionicons name={icon || 'book-outline'} size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.screenTitle} numberOfLines={1}>{title}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{greeting.emoji} {greeting.text}</Text>
            <Text style={styles.cellName}>Library Staff</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={onNotificationsPress}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>
      {subtitle && !showBack ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#b45309',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: { flex: 1 },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Manrope-Medium',
    letterSpacing: 0.3,
  },
  cellName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    fontFamily: 'Manrope-Regular',
    lineHeight: 19,
  },
  notificationBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#b45309',
  },
  backSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12 },
  backBtnBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    flexShrink: 1,
  },
});
