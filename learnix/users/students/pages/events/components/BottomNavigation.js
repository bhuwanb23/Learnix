import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../constants/theme';

export default function BottomNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'events', label: 'Events', icon: 'home', activeIcon: 'home' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
    { id: 'certifications', label: 'Certifications', icon: 'certificate-outline', activeIcon: 'certificate' },
    { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === tab.id ? tab.activeIcon : tab.icon}
            size={20}
            color={activeTab === tab.id ? '#3B82F6' : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.id && styles.activeTabLabel,
            ]}
          >
            {tab.label}
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
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#3B82F6',
  },
});
