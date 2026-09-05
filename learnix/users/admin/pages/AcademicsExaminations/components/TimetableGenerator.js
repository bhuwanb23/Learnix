import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function TimetableGenerator({
  selectedSemester,
  selectedExamType,
  conflictStatus,
  smartSuggestions,
  onSemesterChange,
  onExamTypeChange,
  onGenerateTimetable,
  isGenerating,
  onViewTimetable,
  timetableGenerated,
}) {
  const cycleOption = (options, currentValue, onValueChange) => {
    const idx = options.findIndex(option => option.value === currentValue);
    const next = options[(idx + 1) % options.length];
    onValueChange(next.value);
  };

  const renderDropdown = (label, value, options, onValueChange) => (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => cycleOption(options, value, onValueChange)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownText}>
          {options.find(option => option.value === value)?.label || 'Select Option'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderConflictStatus = (conflict) => (
    <View key={conflict.id} style={styles.conflictItem}>
      <Text style={styles.conflictLabel}>{conflict.label}</Text>
      <View style={[
        styles.conflictBadge,
        { backgroundColor: conflict.status === 'success' ? '#dcfce7' : '#fef3c7' }
      ]}>
        <Text style={[
          styles.conflictBadgeText,
          { color: conflict.status === 'success' ? '#16a34a' : '#d97706' }
        ]}>
          {conflict.count} Found
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles-outline" size={20} color="#7c3aed" />
          </View>
          <View>
            <Text style={styles.title}>Auto Timetable Generator</Text>
            <Text style={styles.subtitle}>AI-powered scheduling</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={onGenerateTimetable}
          disabled={isGenerating}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isGenerating ? "hourglass-outline" : "sparkles-outline"} 
            size={16} 
            color="#FFFFFF" 
          />
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dropdowns */}
        <View style={styles.dropdownsContainer}>
          {renderDropdown(
            'Semester',
            selectedSemester,
            [
              { label: 'Semester 1', value: 'semester-1' },
              { label: 'Semester 2', value: 'semester-2' },
              { label: 'Semester 3', value: 'semester-3' },
              { label: 'Semester 4', value: 'semester-4' },
            ],
            onSemesterChange
          )}
          
          {renderDropdown(
            'Exam Type',
            selectedExamType,
            [
              { label: 'Mid Term', value: 'mid-term' },
              { label: 'Final Exam', value: 'final-exam' },
              { label: 'Quiz', value: 'quiz' },
              { label: 'Assignment', value: 'assignment' },
            ],
            onExamTypeChange
          )}
        </View>

        {/* Conflict Detection Status */}
        <View style={styles.conflictContainer}>
          <Text style={styles.conflictTitle}>Conflict Detection Status</Text>
          <View style={styles.conflictList}>
            {conflictStatus.map(renderConflictStatus)}
          </View>
        </View>

        {/* Smart Suggestions */}
        <View style={styles.suggestionsContainer}>
          <View style={styles.suggestionHeader}>
            <Ionicons name="bulb-outline" size={20} color="#7c3aed" />
            <View style={styles.suggestionContent}>
              <Text style={styles.suggestionTitle}>{smartSuggestions.title}</Text>
              <Text style={styles.suggestionDescription}>
                {smartSuggestions.description}
              </Text>
            </View>
          </View>
          {timetableGenerated ? (
            <TouchableOpacity
              style={styles.viewTimetableButton}
              onPress={onViewTimetable}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.viewTimetableText}>View Generated Timetable</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontFamily: 'Manrope-Medium',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  generateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: 'Manrope-Medium',
    marginLeft: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  dropdownsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    fontFamily: 'Manrope-Medium',
    marginBottom: SPACING.xs,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
    fontFamily: 'Manrope-Medium',
  },
  conflictContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  conflictTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: SPACING.sm,
  },
  conflictList: {
    gap: SPACING.sm,
  },
  conflictItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontFamily: 'Manrope-Medium',
  },
  conflictBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  conflictBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: 'Manrope-Medium',
  },
  suggestionsContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  suggestionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: SPACING.xs,
  },
  suggestionDescription: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Manrope-Medium',
    lineHeight: 16,
  },
  viewTimetableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#7c3aed',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  viewTimetableText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#FFFFFF',
    fontFamily: 'Manrope-Medium',
  },
});
