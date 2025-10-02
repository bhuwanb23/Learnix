import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function TabsSection({ tabs, onTabPress }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tab,
            tab.active && styles.activeTab
          ]}
          onPress={() => onTabPress(tab.id)}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={tab.icon} 
            size={18} 
            color={tab.active ? '#3B82F6' : COLORS.textSecondary}
            style={styles.tabIcon}
          />
          <Text style={[
            styles.tabText,
            tab.active && styles.activeTabText
          ]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: SPACING.xs,
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabIcon: {
    // Icon styling handled in component
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
