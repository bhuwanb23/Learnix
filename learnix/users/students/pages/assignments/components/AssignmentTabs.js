import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function AssignmentTabs({ tabs, activeTab, onTabPress }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const tabFont = isDesktop ? 15 : width >= 768 ? 14 : 13;

  const formatTabValue = (tab) => tab.split(' ')[0].toLowerCase();

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === formatTabValue(tab);
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.tab,
              isActive && styles.activeTab,
            ]}
            onPress={() => onTabPress(formatTabValue(tab))}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                { fontSize: tabFont },
                isActive && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginTop: SPACING.xl,
    flexDirection: 'row',
    gap: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tab: {
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1, // Overlap border
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontWeight: '600',
    color: COLORS.gray500,
    fontFamily: 'Manrope-Medium',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'Manrope-Medium',
  },
});
