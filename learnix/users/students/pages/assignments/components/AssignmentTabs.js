import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function AssignmentTabs({ tabs, activeTab, onTabPress }) {
  // Convert 'Active Tasks' to 'active' for state matching if needed, or keep exact
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
    marginHorizontal: 24, // px-6
    marginTop: 48, // mt-12
    flexDirection: 'row',
    gap: 32, // gap-8
    borderBottomWidth: 1, // border-b
    borderBottomColor: 'rgba(171, 173, 175, 0.1)', // border-outline-variant/10
  },
  tab: {
    paddingBottom: 16, // pb-4
    borderBottomWidth: 2, // border-b-2
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0050d4', // border-primary
  },
  tabText: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#595c5e', // text-on-surface-variant
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#0050d4', // text-primary
    fontWeight: '700', // font-bold
    fontFamily: 'Manrope-Bold',
  },
});
