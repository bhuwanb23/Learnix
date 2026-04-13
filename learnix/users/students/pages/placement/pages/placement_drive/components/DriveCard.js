import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

const statusConfig = {
  open: {
    bg: 'rgba(0, 80, 212, 0.1)',
    text: COLORS.primary,
  },
  registered: {
    bg: COLORS.secondaryContainer,
    text: COLORS.onSecondaryContainer,
  },
  closing: {
    bg: COLORS.tertiaryContainer,
    text: COLORS.onTertiaryContainer,
  },
  upcoming: {
    bg: COLORS.surfaceContainerHigh,
    text: COLORS.textSecondary,
  },
};

const buttonConfig = {
  primary: {
    bg: COLORS.primary,
    text: COLORS.white,
    shadow: true,
  },
  secondary: {
    bg: COLORS.surfaceContainerHigh,
    text: COLORS.textPrimary,
    shadow: false,
  },
  disabled: {
    bg: COLORS.surfaceContainerLow,
    text: COLORS.outline,
    shadow: false,
  },
};

export default function DriveCard({ drive }) {
  const statusStyle = statusConfig[drive.statusType];
  const buttonStyle = buttonConfig[drive.buttonType];

  const getInitialColor = () => {
    switch (drive.statusType) {
      case 'open':
        return COLORS.primary;
      case 'registered':
        return COLORS.secondary;
      case 'closing':
        return COLORS.tertiary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getInitialBg = () => {
    switch (drive.statusType) {
      case 'open':
        return 'rgba(0, 80, 212, 0.05)';
      case 'registered':
        return 'rgba(112, 42, 225, 0.05)';
      case 'closing':
        return 'rgba(162, 56, 0, 0.05)';
      default:
        return 'rgba(171, 173, 175, 0.1)';
    }
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.85}>
      {/* Header: Initial & Status */}
      <View style={styles.header}>
        <View style={[styles.initialContainer, { backgroundColor: getInitialBg() }]}>
          <Text style={[styles.initialText, { color: getInitialColor() }]}>
            {drive.initial}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {drive.status}
          </Text>
        </View>
      </View>

      {/* Company & Role */}
      <Text style={styles.company}>{drive.company}</Text>
      <Text style={styles.role}>{drive.role}</Text>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <View style={styles.detailIconBox}>
            <Ionicons
              name={drive.locationType === 'virtual' ? 'videocam-outline' : 'calendar-outline'}
              size={16}
              color={COLORS.textSecondary}
            />
          </View>
          <Text style={styles.detailText}>{drive.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <View style={styles.detailIconBox}>
            <Ionicons
              name={drive.locationType === 'virtual' ? 'globe-outline' : 'location-outline'}
              size={16}
              color={COLORS.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.detailText,
              drive.locationType === 'virtual' && styles.virtualText,
            ]}
          >
            {drive.location}
          </Text>
        </View>
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: buttonStyle.bg },
          buttonStyle.shadow && styles.buttonShadow,
        ]}
        activeOpacity={drive.buttonType === 'disabled' ? 1 : 0.8}
        disabled={drive.buttonType === 'disabled'}
      >
        <Text style={[styles.buttonText, { color: buttonStyle.text }]}>
          {drive.buttonText}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  initialContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  company: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  details: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textSecondary,
    flex: 1,
  },
  virtualText: {
    color: COLORS.primary,
  },
  button: {
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  buttonShadow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
