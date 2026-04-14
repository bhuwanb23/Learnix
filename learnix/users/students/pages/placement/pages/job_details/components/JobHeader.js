import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function JobHeader({ company, title, type, isUrgent }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>{company.charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.badges}>
            <View style={[styles.badge, styles.badgeSecondary]}>
              <Text style={styles.badgeTextSecondary}>{type}</Text>
            </View>
            {isUrgent && (
              <View style={[styles.badge, styles.badgeTertiary]}>
                <Text style={styles.badgeTextTertiary}>Urgent</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.company}>{company}</Text>
        </View>
      </View>
      {/* Decorative Circle */}
      <View style={styles.decorativeCircle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    gap: SPACING.lg,
    position: 'relative',
    zIndex: 10,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 40,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.primary,
  },
  info: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeSecondary: {
    backgroundColor: COLORS.secondaryContainer,
  },
  badgeTertiary: {
    backgroundColor: COLORS.tertiaryContainer,
  },
  badgeTextSecondary: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: COLORS.onSecondaryContainer,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badgeTextTertiary: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: COLORS.onTertiaryContainer,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 4,
  },
  company: {
    fontSize: 18,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primary,
  },
  decorativeCircle: {
    position: 'absolute',
    right: -60,
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 80, 212, 0.05)',
  },
});
