import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function Settings({ onNotificationPress, onSettingsPress }) {
  const settingsOptions = [
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: '3 new notifications',
      icon: 'notifications-outline',
      color: COLORS.primary,
      backgroundColor: COLORS.primary + '20',
      onPress: onNotificationPress,
    },
    {
      id: 'profile',
      title: 'Edit Profile',
      subtitle: 'Update your information',
      icon: 'person-outline',
      color: COLORS.blue,
      backgroundColor: COLORS.blue + '20',
      onPress: () => {},
    },
    {
      id: 'security',
      title: 'Security',
      subtitle: 'Password & privacy',
      icon: 'shield-outline',
      color: COLORS.green,
      backgroundColor: COLORS.green + '20',
      onPress: () => {},
    },
    {
      id: 'preferences',
      title: 'Preferences',
      subtitle: 'App settings',
      icon: 'settings-outline',
      color: COLORS.purple,
      backgroundColor: COLORS.purple + '20',
      onPress: onSettingsPress,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.optionsList}>
        {settingsOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionItem}
            onPress={option.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, { backgroundColor: option.backgroundColor }]}>
              <Ionicons name={option.icon} size={18} color={option.color} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
    marginBottom: SPACING.md,
  },
  optionsList: {
    gap: SPACING.xs,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
    marginBottom: SPACING.xs,
  },
  optionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: 0.1,
  },
});
