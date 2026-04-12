import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { UPCOMING_ASSIGNMENT_COLORS } from '../constants/upcomingAssignmentData';

export default function DescriptionCard({ description }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Description</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UPCOMING_ASSIGNMENT_COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 18,
    margin: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Manrope-Regular',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurfaceVariant,
    lineHeight: 20,
  },
});
