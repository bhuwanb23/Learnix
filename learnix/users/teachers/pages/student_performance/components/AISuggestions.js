import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AISuggestions({ suggestions, onAction }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="lightbulb" size={24} color="#702ae1" />
        <Text style={styles.title}>AI Strategy</Text>
      </View>
      <View style={styles.content}>
        {suggestions.map((suggestion) => (
          <View
            key={suggestion.id}
            style={[styles.suggestionCard, { borderLeftColor: suggestion.color }]}
          >
            <Text style={styles.text}>{suggestion.text}</Text>
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={() => onAction && onAction(suggestion)}
            >
              <Text style={[styles.actionText, { color: suggestion.color }]}>
                {suggestion.action}
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color={suggestion.color} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
  },
  content: {
    paddingHorizontal: 24,
    gap: 16,
  },
  suggestionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  text: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontFamily: 'Manrope-ExtraBold',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
