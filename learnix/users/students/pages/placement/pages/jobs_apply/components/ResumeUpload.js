import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../constants/theme';

export default function ResumeUpload() {
  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(112, 42, 225, 0.05)' }]}>
            <Ionicons name="cloud-upload-outline" size={22} color={COLORS.secondary} />
          </View>
          <Text style={styles.sectionTitle}>Resume Upload</Text>
        </View>

        <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7}>
          <View style={styles.uploadIconContainer}>
            <Ionicons name="document-outline" size={36} color={COLORS.error} />
          </View>
          <Text style={styles.uploadTitle}>Upload your resume</Text>
          <Text style={styles.uploadSubtitle}>PDF, DOCX up to 10MB</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.lg + 4,
    padding: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg + SPACING.xs,
    paddingTop: SPACING.lg + SPACING.xs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(171, 173, 175, 0.3)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.xxl + SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 247, 249, 0.3)',
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: BORDER_RADIUS.lg + 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  uploadSubtitle: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
