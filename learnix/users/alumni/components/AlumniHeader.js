import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AlumniHeader({ title, subtitle, onNotificationsPress, showBack, onBackPress, icon }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Good Morning';
    if (hour < 17) return '🌤️ Good Afternoon';
    return '🌙 Good Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
      <View style={styles.topSection}>
        {showBack ? (
          <View style={styles.backSection}>
            <TouchableOpacity style={styles.backBtn} onPress={onBackPress} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.titleRow}>
              <View style={styles.iconWrap}>
                <Ionicons name={icon || 'people-circle-outline'} size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.screenTitle} numberOfLines={1}>{title}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.greetingSection}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.cellName}>Alumni Relations</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        )}
        <TouchableOpacity style={styles.notifBtn} onPress={onNotificationsPress} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetingSection: { flex: 1 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope-Medium', letterSpacing: 0.3 },
  cellName: { fontSize: 24, color: '#FFFFFF', letterSpacing: -0.5, fontFamily: 'PlusJakartaSans-ExtraBold', marginTop: 2 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 17 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: { position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#7c3aed' },
  backSection: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  screenTitle: { fontSize: 18, color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', flexShrink: 1 },
});