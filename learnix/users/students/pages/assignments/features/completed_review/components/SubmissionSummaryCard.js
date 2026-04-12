import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function SubmissionSummaryCard({ assignment }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Submission Summary</Text>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Submission Date</Text>
          <Text style={styles.infoValue}>{assignment.submissionDate}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={[styles.infoLabel, { color: COMPLETED_REVIEW_COLORS.secondary }]}>Current Status</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.infoValue}>{assignment.currentStatus}</Text>
          </View>
        </View>
      </View>

      <View style={styles.responsesSection}>
        <View style={styles.sectionHeader} />
        <Text style={styles.sectionTitle}>Key Responses Preview</Text>
        
        {assignment.responses.map((response, index) => (
          <View key={index} style={styles.responseCard}>
            <Text style={styles.questionText}>{response.question}</Text>
            <Text style={styles.answerText}>{response.answer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainerLowest,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
  },
  draftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  draftButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
  },
  infoGrid: {
    gap: 20,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 8,
  },
  infoLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  infoValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COMPLETED_REVIEW_COLORS.tertiaryContainer,
  },
  responsesSection: {
    gap: 16,
  },
  sectionHeader: {
    width: 4,
    height: 20,
    backgroundColor: COMPLETED_REVIEW_COLORS.primary,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
    marginLeft: 12,
    marginTop: -24,
    marginBottom: 8,
  },
  responseCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COMPLETED_REVIEW_COLORS.outlineVariant}20`,
    backgroundColor: `${COMPLETED_REVIEW_COLORS.surface}80`,
    gap: 8,
  },
  questionText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurfaceVariant,
  },
  answerText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: COMPLETED_REVIEW_COLORS.onSurface,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
