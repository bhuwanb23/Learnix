import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../../constants/theme';

const TabNavigation = ({ tabs, activeTab, onTabPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Active tab styling
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
  },
});

export default TabNavigation;
