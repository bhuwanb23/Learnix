import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../constants/theme';
import { useStudentResponsive } from '../hooks/useStudentResponsive';
import { STUDENT_HOME_FONT } from '../constants/studentHomeTypography';

const SCREEN_TITLES = {
  Home: 'Home',
  Classes: 'Classes',
  Assignments: 'Assignments',
  Events: 'Events',
  Placement: 'Placement',
  Profile: 'Profile',
};

export default function StudentHeader({ activeTab, onProfilePress }) {
  const insets = useSafeAreaInsets();
  const { width, horizontalPadding, isTablet, isDesktop, contentMaxWidth } =
    useStudentResponsive();

  const safeTop = Math.max(insets.top, Platform.OS === 'android' ? 6 : 0);
  const actionIconSize = isTablet ? 24 : 22;
  const pageTitle = SCREEN_TITLES[activeTab] ?? activeTab ?? 'Learnix';

  return (
    <View
      style={[
        styles.bleed,
        {
          width,
          marginHorizontal: -horizontalPadding,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View
        style={[
          styles.bar,
          {
            paddingTop: safeTop + 10,
            paddingBottom: SPACING.md,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View
          style={[
            styles.row,
            isDesktop && styles.rowDesktop,
            isDesktop && {
              maxWidth: contentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
        >
          <View style={styles.leftBlock}>
            <Text style={styles.greeting}>Hello! Alex</Text>
            <Text
              style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}
              numberOfLines={1}
            >
              {pageTitle}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconHit}
              onPress={onProfilePress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Ionicons name="person-outline" size={actionIconSize} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconHit}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={actionIconSize} color="#FFFFFF" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: {
    alignSelf: 'center',
  },
  bar: {
    backgroundColor: COLORS.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 52,
  },
  rowDesktop: {
    minHeight: 56,
  },
  leftBlock: {
    flex: 1,
    marginRight: SPACING.md,
    minWidth: 0,
  },
  greeting: {
    fontSize: STUDENT_HOME_FONT.bodySecondary,
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: 2,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  pageTitle: {
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.3,
  },
  pageTitleTablet: {
    fontSize: STUDENT_HOME_FONT.sectionTitle + 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconHit: {
    position: 'relative',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: BORDER_RADIUS.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'Manrope-Bold',
  },
});
