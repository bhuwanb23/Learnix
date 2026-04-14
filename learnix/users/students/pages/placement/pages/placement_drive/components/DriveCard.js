import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

  const getGradientColors = () => {
    switch (drive.statusType) {
      case 'open':
        return ['#0050d4', '#0066ff'];
      case 'registered':
        return ['#702ae1', '#8b4ff0'];
      case 'closing':
        return ['#a23800', '#c44500'];
      default:
        return ['#595c5e', '#747779'];
    }
  };

  const getIconName = () => {
    switch (drive.statusType) {
      case 'open':
        return 'flash';
      case 'registered':
        return 'checkmark-circle';
      case 'closing':
        return 'time';
      default:
        return 'hourglass';
    }
  };

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.9}>
      {/* Gradient Header */}
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.initialContainer}>
            <Text style={styles.initialText}>{drive.initial}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Ionicons name={getIconName()} size={12} color={COLORS.white} style={styles.statusIcon} />
            <Text style={styles.statusText}>{drive.status}</Text>
          </View>
        </View>
        {/* Decorative Circle */}
        <View style={styles.decorativeCircle} />
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Company & Role */}
        <Text style={styles.company}>{drive.company}</Text>
        <Text style={styles.role}>{drive.role}</Text>

        {/* Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons
                name={drive.locationType === 'virtual' ? 'videocam' : 'calendar'}
                size={16}
                color={drive.locationType === 'virtual' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[
                styles.detailText,
                drive.locationType === 'virtual' && styles.virtualText
              ]}>
                {drive.date}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons
                name={drive.locationType === 'virtual' ? 'globe' : 'location'}
                size={16}
                color={drive.locationType === 'virtual' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[
                styles.detailText,
                drive.locationType === 'virtual' && styles.virtualText
              ]}>
                {drive.location}
              </Text>
            </View>
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[
            styles.button,
            buttonStyle.shadow && styles.buttonShadow,
            drive.buttonType === 'disabled' && styles.buttonDisabled,
          ]}
          activeOpacity={drive.buttonType === 'disabled' ? 1 : 0.85}
          disabled={drive.buttonType === 'disabled'}
        >
          {drive.buttonType === 'primary' && (
            <Ionicons name="arrow-forward" size={16} color={COLORS.white} style={styles.buttonIcon} />
          )}
          <Text style={[
            styles.buttonText,
            { color: buttonStyle.text },
            drive.buttonType === 'disabled' && styles.buttonTextDisabled
          ]}>
            {drive.buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: SPACING.md,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.lg + 4,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    zIndex: 10,
  },
  initialContainer: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  initialText: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  decorativeCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: SPACING.lg,
    paddingTop: SPACING.lg - 2,
  },
  company: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  role: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  detailsContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: TYPOGRAPHY.fontWeight.semiBold,
    color: COLORS.textSecondary,
    flex: 1,
  },
  virtualText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerHigh,
    gap: 6,
  },
  buttonShadow: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginLeft: 2,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  buttonTextDisabled: {
    opacity: 0.6,
  },
});
