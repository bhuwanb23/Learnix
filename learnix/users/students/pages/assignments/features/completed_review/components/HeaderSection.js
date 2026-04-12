import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function HeaderSection({ title, onBack }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4"/>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Details</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COMPLETED_REVIEW_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COMPLETED_REVIEW_COLORS.surfaceContainer,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
    marginLeft: 12,
  },
});
