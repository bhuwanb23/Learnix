import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../constants/theme';

// Import Application constants
import { APPLICATION_DATA } from './constants/applicationData';

export default function JobApply({ navigation, route }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleSubmitApplication = () => {
    if (!isConfirmed) {
      alert('Please confirm the information before submitting');
      return;
    }
    alert('Application submitted successfully!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton} 
            activeOpacity={0.7}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Application Process</Text>
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active Posting</Text>
            </View>
            <Text style={styles.jobTitle}>Senior Product Designer</Text>
            <Text style={styles.companyName}>Lumina Global Systems • Remote, Global</Text>
          </View>

          {/* Section 1: Basic Details */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 80, 212, 0.05)' }]}>
                  <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Basic Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  value={APPLICATION_DATA.fullName}
                  editable={false}
                  selectable
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  value={APPLICATION_DATA.email}
                  editable={false}
                  keyboardType="email-address"
                  selectable
                />
              </View>
            </View>
          </View>

          {/* Section 2: Resume Upload */}
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

          {/* Section 3: Cover Letter */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(162, 56, 0, 0.05)' }]}>
                  <Ionicons name="create-outline" size={22} color={COLORS.tertiary} />
                </View>
                <Text style={styles.sectionTitle}>Cover Letter</Text>
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                value={coverLetter}
                onChangeText={setCoverLetter}
                placeholder="Tell us why you are a great fit for Lumina..."
                placeholderTextColor={COLORS.outlineVariant}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Section 4: Confirmation */}
          <View style={styles.confirmationSection}>
            <TouchableOpacity 
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setIsConfirmed(!isConfirmed)}
            >
              <View style={[styles.checkbox, isConfirmed && styles.checkboxChecked]}>
                {isConfirmed && (
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                )}
              </View>
              <Text style={styles.confirmationText}>
                I confirm that the information provided is accurate and I agree to the{' '}
                <Text style={styles.linkText}>Privacy Policy</Text> and{' '}
                <Text style={styles.linkText}>Terms of Service</Text>.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton,
              !isConfirmed && styles.submitButtonDisabled
            ]} 
            activeOpacity={0.85}
            onPress={handleSubmitApplication}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitButtonText}>Confirm Application</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Company Quote */}
          <View style={styles.quoteCard}>
            <View style={styles.quoteOverlay} />
            <View style={styles.quoteContent}>
              <Ionicons name="quote" size={32} color={COLORS.primaryContainer} style={{ marginBottom: SPACING.md }} />
              <Text style={styles.quoteText}>
                "We are building the future of enterprise intelligence. Your design eye is the lens through which our users will experience that future."
              </Text>
              <View style={styles.authorInfo}>
                <View style={styles.authorAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.authorName}>Sarah Chen</Text>
                  <Text style={styles.authorRole}>VP of Product Design, Lumina</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.1)',
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  menuButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    letterSpacing: -1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
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
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 0,
    borderRadius: BORDER_RADIUS.lg - 2,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 15,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 150,
    paddingTop: SPACING.md + 4,
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
  confirmationSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  linkText: {
    color: COLORS.primary,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
  },
  submitButton: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  quoteCard: {
    marginHorizontal: SPACING.md,
    backgroundColor: 'rgba(123, 156, 255, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl + SPACING.md,
    overflow: 'hidden',
    position: 'relative',
  },
  quoteOverlay: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 80, 212, 0.05)',
  },
  quoteContent: {
    position: 'relative',
    zIndex: 1,
  },
  quoteText: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Italic',
    fontStyle: 'italic',
    color: COLORS.onPrimaryContainer,
    lineHeight: 26,
    marginBottom: SPACING.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: COLORS.onPrimaryContainer,
  },
  authorRole: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: 'rgba(39, 71, 163, 0.7)',
  },
});
