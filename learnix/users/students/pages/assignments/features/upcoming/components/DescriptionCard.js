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
    padding: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurface,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Manrope-Regular',
    color: UPCOMING_ASSIGNMENT_COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
});
