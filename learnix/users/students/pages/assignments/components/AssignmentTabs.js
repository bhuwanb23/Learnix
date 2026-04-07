import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function AssignmentTabs({ tabs, activeTab, onTabPress }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.tab,
            activeTab === tab.toLowerCase().replace(' ', '-') && styles.activeTab,
          ]}
          onPress={() => onTabPress(tab.toLowerCase().replace(' ', '-'))}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.toLowerCase().replace(' ', '-') && styles.activeTabText,
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 48,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.1)',
  },
  tab: {
    paddingBottom: 16,
    marginRight: 32,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0050d4',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#595c5e',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#0050d4',
    fontWeight: '700',
  },
});
