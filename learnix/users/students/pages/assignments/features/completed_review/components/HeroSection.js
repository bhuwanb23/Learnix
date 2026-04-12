import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function HeroSection({ assignment }) {
  return (
    <View style={styles.heroContainer}>
      <View style={styles.heroBackground} />
      <View style={styles.heroContent}>
        <View style={styles.statusTextContainer}>
          <MaterialIcons name="verified" size={14} color={COMPLETED_REVIEW_COLORS.onPrimary} />
          <Text style={styles.statusText}>{assignment.status}</Text>
        </View>
        <Text style={styles.title}>{assignment.title}</Text>
        <Text style={styles.subtitle}>
          Excellent work! Your submission has been recorded. Our instructors will review your analysis and provide feedback soon.
        </Text>
      </View>
      <View style={styles.statusCard}>
        <MaterialIcons name="celebration" size={48} color={COMPLETED_REVIEW_COLORS.primary} />
        <Text style={styles.statusCardTitle}>Done</Text>
        <Text style={styles.statusCardSubtitle}>100% Uploaded</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    backgroundColor: COMPLETED_REVIEW_COLORS.primary,
    margin: 16,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBackground: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroContent: {
    flex: 1,
    zIndex: 1,
  },
  statusTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    fontWeight: '800',
    color: COMPLETED_REVIEW_COLORS.onPrimary,
    lineHeight: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(241, 242, 255, 0.8)',
    lineHeight: 18,
  },
  statusCard: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusCardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
    marginTop: 4,
  },
  statusCardSubtitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    fontWeight: '600',
    color: COMPLETED_REVIEW_COLORS.onSurfaceVariant,
  },
});
