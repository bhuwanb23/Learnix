import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
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
    borderBottomColor: '#E5E7EB'
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#2563EB',
    backgroundColor: '#EFF6FF'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280'
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '600'
  }
});

export default TabNavigation;
