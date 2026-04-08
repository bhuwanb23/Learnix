import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function Sidebar({ registrations, stats, trendingTags }) {
  
  const handleTagPress = (tag) => {
    // Add visual feedback or navigation later
    console.log('Pressed tag:', tag);
  };

  return (
    <View style={styles.sidebar}>
      {/* My Registrations */}
      <View style={styles.sidebarSection}>
        <View style={styles.sidebarHeader}>
          <MaterialIcons name="confirmation-number" size={20} color={COLORS.primary} />
          <Text style={styles.sidebarTitle}>My Tickets</Text>
        </View>
        {registrations.map((reg) => (
          <TouchableOpacity 
            key={reg.id} 
            style={[styles.registrationCard, { borderLeftColor: reg.borderColor }]}
            activeOpacity={0.8}
          >
            <View style={styles.registrationHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.registrationTitle} numberOfLines={1}>{reg.title}</Text>
                <Text style={styles.registrationDate}>{reg.datetime}</Text>
              </View>
              <TouchableOpacity style={styles.moreOptionsBtn}>
                <MaterialIcons name="more-vert" size={20} color={COLORS.gray400} />
              </TouchableOpacity>
            </View>
            <View style={styles.registrationBody}>
              <View style={styles.qrContainer}>
                <Image source={{ uri: reg.qrCode }} style={styles.qrImage} />
              </View>
              <View style={styles.registrationInfo}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.reminderLabel}>REMINDER</Text>
                  <View style={[styles.toggleTrack, reg.reminderActive ? styles.toggleActive : styles.toggleInactive]}>
                    <View style={[styles.toggleThumb, reg.reminderActive ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
                  </View>
                </View>
                <Text style={[styles.reminderText, { color: reg.reminderColor }]} numberOfLines={1}>
                  {reg.reminderText}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
          <Text style={styles.viewAllBtnText}>View All Tickets</Text>
          <MaterialIcons name="arrow-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Bento Stats */}
      <View style={styles.bentoGrid}>
        <View style={[styles.bentoCard, styles.bentoCard1]}>
          <View style={styles.bentoIconWrapper1}>
            <MaterialIcons name="calendar-month" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.bentoValue1}>{stats.upcoming}</Text>
          <Text style={styles.bentoLabel1}>UPCOMING EVENTS</Text>
        </View>
        <View style={[styles.bentoCard, styles.bentoCard2]}>
          <View style={styles.bentoIconWrapper2}>
            <MaterialIcons name="stars" size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.bentoValue2}>{stats.xpEarned}</Text>
          <Text style={styles.bentoLabel2}>TOTAL XP EARNED</Text>
        </View>
      </View>

      {/* Trending Tags */}
      <View style={styles.trendingSection}>
        <View style={styles.sidebarHeader}>
          <MaterialIcons name="trending-up" size={20} color={COLORS.textPrimary} />
          <Text style={styles.sidebarTitle}>Trending Tags</Text>
        </View>
        <View style={styles.tagsContainer}>
          {trendingTags.map((tag, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.tagBtn}
              activeOpacity={0.7}
              onPress={() => handleTagPress(tag)}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    gap: SPACING.xl,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  sidebarSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    ...SHADOWS.sm,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
    letterSpacing: -0.3,
  },
  registrationCard: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    marginBottom: SPACING.md,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.gray100,
  },
  registrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  moreOptionsBtn: {
    padding: 4,
    marginRight: -4,
    marginTop: -4,
  },
  registrationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginBottom: 4,
  },
  registrationDate: {
    fontSize: 11,
    color: COLORS.gray500,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  registrationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    padding: 6,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  qrImage: {
    width: 40,
    height: 40,
    opacity: 0.7,
  },
  registrationInfo: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reminderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gray400,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    letterSpacing: 0.5,
  },
  toggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleInactive: {
    backgroundColor: COLORS.gray200,
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    position: 'absolute',
  },
  toggleThumbActive: {
    right: 2,
    shadowColor: '#000',
    shadowOffset: { width: -1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleThumbInactive: {
    left: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  viewAllBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  viewAllBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  bentoCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'flex-start',
  },
  bentoCard1: {
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  bentoCard2: {
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  bentoIconWrapper1: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bentoIconWrapper2: {
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bentoValue1: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  bentoLabel1: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    opacity: 0.7,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  bentoValue2: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.accent,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  bentoLabel2: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    opacity: 0.7,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    letterSpacing: 0.5,
  },
  trendingSection: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    ...SHADOWS.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tagBtn: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray600,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
});