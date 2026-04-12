import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EVENT_DETAILS_COLORS } from '../constants/eventDetailsData';

export default function AboutSection({ about }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>About this Event</Text>
      <View style={styles.card}>
        <Text style={styles.description}>{about}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
    marginBottom: 16,
  },
  card: {
    backgroundColor: EVENT_DETAILS_COLORS.surfaceContainerLowest,
    padding: 24,
    borderRadius: 16,
  },
  description: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: EVENT_DETAILS_COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
});
