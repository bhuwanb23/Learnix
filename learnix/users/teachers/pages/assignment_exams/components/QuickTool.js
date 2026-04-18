import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function QuickTool({ tool, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        tool.gradient && {
          backgroundColor: tool.color,
        },
        !tool.gradient && {
          backgroundColor: '#dfe3e6',
        },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.header}>
        <MaterialIcons
          name={tool.icon}
          size={28}
          color={tool.gradient ? '#ffffff' : tool.color}
        />
        <MaterialIcons
          name="arrow-forward"
          size={20}
          color={tool.gradient ? '#ffffff' : '#595c5e'}
          style={styles.arrow}
        />
      </View>
      <Text
        style={[
          styles.title,
          tool.gradient && { color: '#ffffff' },
          !tool.gradient && { color: '#2c2f31' },
        ]}
      >
        {tool.title}
      </Text>
      <Text
        style={[
          styles.subtitle,
          tool.gradient && { color: '#ffffffcc' },
          !tool.gradient && { color: '#595c5e' },
        ]}
      >
        {tool.subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  arrow: {
    opacity: 0,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
