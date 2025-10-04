import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const NavigationTabs = ({ 
  tabs, 
  activeTab, 
  onTabPress 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === tab.id && styles.activeTabButton
            ]}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id ? styles.activeTabText : styles.inactiveTabText
              ]}
            >
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 4
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeTabButton: {
    backgroundColor: '#EFF6FF'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500'
  },
  activeTabText: {
    color: '#2563EB'
  },
  inactiveTabText: {
    color: '#6B7280'
  }
});

export default NavigationTabs;
