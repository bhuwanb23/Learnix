import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../../../../constants/theme';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

export default function AssignmentHeader({ onCalendarPress }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const titleSize = STUDENT_HOME_FONT.heroTitle;
  const iconSize = isDesktop ? 24 : isTablet ? 22 : 20;
  const btnSize = isDesktop ? 46 : isTablet ? 44 : 40;
  // Match Home / StudentHeader: outer scroll already applies 12 / 20 / 28 — keep title row full width inside that inset
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Assignments</Text>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.calendarButton, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }]}
            onPress={onCalendarPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open assignment due date calendar"
          >
            <MaterialIcons name="calendar-today" size={iconSize} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.gray50,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  title: {
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.5,
  },
  calendarButton: {
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
});
