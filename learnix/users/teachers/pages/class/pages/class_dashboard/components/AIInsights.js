import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AIInsights({ insight }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={insight.icon} size={24} color="#ffffff" />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.text}>
          {insight.content.split(/(".*?")/).map((part, index) =>
            part.startsWith('"') && part.endsWith('"') ? (
              <Text key={index} style={styles.strong}>{part}</Text>
            ) : (
              part
            )
          )}
        </Text>
        <View style={styles.actions}>
          {insight.actions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionButton} activeOpacity={0.7}>
              <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 20,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 32,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#702ae1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '800',
    color: '#702ae1',
    marginBottom: 4,
  },
  text: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#2c2f31',
    lineHeight: 22,
  },
  strong: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
  },
});
