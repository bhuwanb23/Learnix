import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

export default function HeaderSection({ onBack }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COMPLETED_RESULTS_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Feedback</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COMPLETED_RESULTS_COLORS.surface,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onSurface,
    marginLeft: 12,
  },
});
