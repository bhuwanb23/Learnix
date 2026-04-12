import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_REVIEW_COLORS } from '../constants/submissionReviewData';

export default function SuccessCard({ data, onReturnDashboard, onViewDetails }) {
  return (
    <View style={styles.container}>
      <View style={styles.successIcon}>
        <MaterialIcons name="check-circle" size={48} color={SUBMISSION_REVIEW_COLORS.primary} />
      </View>

      <Text style={styles.successTitle}>Submission Successful</Text>
      <Text style={styles.submissionDate}>{data.submissionDate}</Text>

      <View style={styles.filesSection}>
        {data.files.map((file) => (
          <View key={file.id} style={styles.fileCard}>
            <View style={[styles.fileIcon, { backgroundColor: SUBMISSION_REVIEW_COLORS.surfaceContainerLowest }]}>
              <MaterialIcons 
                name={file.icon} 
                size={24} 
                color={file.color === 'primary' ? SUBMISSION_REVIEW_COLORS.primary : SUBMISSION_REVIEW_COLORS.secondary} 
              />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[
                styles.fileType,
                { color: file.color === 'primary' ? SUBMISSION_REVIEW_COLORS.primary : SUBMISSION_REVIEW_COLORS.secondary }
              ]}>
                {file.type}
              </Text>
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.primaryButton} onPress={onReturnDashboard} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onViewDetails} activeOpacity={0.7}>
          <Text style={styles.secondaryButtonText}>View Submission Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SUBMISSION_REVIEW_COLORS.surfaceContainerLowest,
    borderRadius: 16,
    margin: 16,
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${SUBMISSION_REVIEW_COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '800',
    color: SUBMISSION_REVIEW_COLORS.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  submissionDate: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: SUBMISSION_REVIEW_COLORS.onSurfaceVariant,
    marginBottom: 40,
  },
  filesSection: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  },
  fileCard: {
    backgroundColor: SUBMISSION_REVIEW_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileType: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  fileName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.onSurface,
  },
  actionSection: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: SUBMISSION_REVIEW_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.onPrimary,
  },
  secondaryButton: {
    backgroundColor: SUBMISSION_REVIEW_COLORS.surfaceContainerHigh,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.onSurface,
  },
});
