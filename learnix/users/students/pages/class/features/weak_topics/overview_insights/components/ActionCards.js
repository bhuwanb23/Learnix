import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEAK_TOPICS_COLORS } from '../constants/weakTopicsData';

export default function ActionCards({ cards }) {
  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <TouchableOpacity key={card.id} style={styles.card} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: card.bgColor }]}>
            <Ionicons name={card.icon} size={24} color={card.color} />
          </View>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.description}>{card.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerLowest,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${WEAK_TOPICS_COLORS.outlineVariant}1A`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
});
