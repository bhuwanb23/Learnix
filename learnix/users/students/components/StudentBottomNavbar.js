import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';

const navigationItems = [
  {
    id: 'Home',
    label: 'Home',
    icon: '🏠',
    description: 'Dashboard, attendance, schedule, AI Study Buddy',
  },
  {
    id: 'Classes',
    label: 'Classes',
    icon: '📚',
    description: 'Lecture notes, syllabus, quizzes, weak-topic alerts',
  },
  {
    id: 'Assignments',
    label: 'Assignments',
    icon: '📝',
    description: 'Submit work, take quizzes, exam schedule, analytics',
  },
  {
    id: 'Events',
    label: 'Events',
    icon: '🎉',
    description: 'Event registration, RSVPs, hostel info, collaborations',
  },
  {
    id: 'Profile',
    label: 'Profile',
    icon: '👤',
    description: 'Personal info, habit tracker, wallet, achievements',
  },
];

export default function StudentBottomNavbar({ activeTab, onTabChange }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.navbar}>
          {navigationItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                activeTab === item.id && styles.activeNavItem,
              ]}
              onPress={() => onTabChange(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Text
                  style={[
                    styles.icon,
                    activeTab === item.id && styles.activeIcon,
                  ]}
                >
                  {item.icon}
                </Text>
                {activeTab === item.id && (
                  <View style={styles.activeIndicator} />
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  activeTab === item.id && styles.activeLabel,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.white,
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 60,
    justifyContent: 'center',
  },
  activeNavItem: {
    backgroundColor: COLORS.primary + '10',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
    opacity: 0.6,
  },
  activeIcon: {
    opacity: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textAlign: 'center',
  },
  activeLabel: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
