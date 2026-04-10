import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NOTES_COLORS } from '../constants/notesData';

export default function TabNavigation({ tabs, activeTab, onTabPress }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.toLowerCase();
        return (
          <TouchableOpacity
            key={index}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabPress(tab.toLowerCase())}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
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
    flexDirection: 'row',
    backgroundColor: NOTES_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 4,
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: NOTES_COLORS.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: NOTES_COLORS.onSurfaceVariant,
  },
  activeTabText: {
    color: NOTES_COLORS.primary,
    fontWeight: '700',
  },
});
