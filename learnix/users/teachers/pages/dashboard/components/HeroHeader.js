import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function HeroHeader({ header }) {
  return (
    <LinearGradient colors={["#3B82F6", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          <View style={styles.avatarCircle}>
            <Ionicons name="school" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.greeting}>{header.greeting}</Text>
            <Text style={styles.name}>{header.name}</Text>
          </View>
        </View>
        <View style={styles.rightGroup}>
          <View style={styles.bellWrap}>
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
            {header.notifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{header.notifications}</Text>
              </View>
            )}
          </View>
          {!!header.avatar && (
            <Image source={{ uri: header.avatar }} style={styles.avatar} />
          )}
        </View>
      </View>
      <View style={styles.centerText}>
        <Text style={styles.date}>{header.dateText}</Text>
        <Text style={styles.count}>{header.classesScheduledText}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  name: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  bellWrap: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  badgeText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  avatar: { width: 36, height: 36, borderRadius: BORDER_RADIUS.full, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  centerText: { alignItems: 'center' },
  date: { color: '#DBEAFE', fontSize: TYPOGRAPHY.sizes.xs, marginBottom: 2 },
  count: { color: '#FFFFFF', fontWeight: TYPOGRAPHY.weights.bold, fontSize: 20 },
});


