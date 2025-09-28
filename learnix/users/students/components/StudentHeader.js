import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

export default function StudentHeader({ activeTab }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'Home': return 'Dashboard';
      case 'Classes': return 'Classes';
      case 'Assignments': return 'Assignments & Exams';
      case 'Events': return 'Events & Campus Life';
      case 'Profile': return 'Profile & Wallet';
      default: return 'Dashboard';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      {/* Top Section */}
      <View style={styles.topSection}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.studentName}>John Doe</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Notifications */}
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔔</Text>
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          
          {/* Profile Avatar */}
          <TouchableOpacity style={styles.avatarButton}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Page Title */}
      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>{getTabTitle()}</Text>
        <Text style={styles.pageSubtitle}>
          {activeTab === 'Home' && 'Track your academic progress'}
          {activeTab === 'Classes' && 'Manage your courses and materials'}
          {activeTab === 'Assignments' && 'Submit work and track performance'}
          {activeTab === 'Events' && 'Stay connected with campus life'}
          {activeTab === 'Profile' && 'Manage your account and achievements'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  studentName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionButton: {
    position: 'relative',
    padding: SPACING.sm,
  },
  actionIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  avatarButton: {
    padding: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  titleSection: {
    marginTop: SPACING.sm,
  },
  pageTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
});
