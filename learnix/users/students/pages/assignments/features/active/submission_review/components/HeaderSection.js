import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_REVIEW_COLORS } from '../constants/submissionReviewData';

export default function HeaderSection({ data, onBack }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={SUBMISSION_REVIEW_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{data.title}</Text>
      </View>
      <Text style={styles.timerText}>{data.timeRemaining}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: SUBMISSION_REVIEW_COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.onSurface,
    marginLeft: 12,
  },
  timerText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.primary,
  },
});
