import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

export default function AdminHeader({
  title,
  icon = 'grid-outline',
  showBack = false,
  onBackPress,
  onNotificationsPress,
}) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.greetingContainer}>
          {showBack ? (
            // Sub-screen header with back button and title
            <View style={styles.subScreenHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBackPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.titleSection}>
                <Ionicons name={icon} size={18} color="#FFFFFF" />
                <Text style={styles.screenTitle} numberOfLines={1}>{title}</Text>
              </View>
            </View>
          ) : (
            // Main header with greeting
            <>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.adminName}>{title}</Text>
            </>
          )}
        </View>

        <View style={styles.headerActions}>
          {/* Notifications */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNotificationsPress}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingTop: SPACING.xs,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1d4ed8',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    letterSpacing: 0.5,
    fontFamily: 'Manrope-Medium',
  },
  adminName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: BORDER_RADIUS.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
  subScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.2,
    flex: 1,
  },
});