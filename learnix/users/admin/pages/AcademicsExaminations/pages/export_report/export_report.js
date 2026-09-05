import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ActionButton from '../../../../components/ui/ActionButton';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../constants/theme';

const REPORT_TYPES = {
  evaluation: { title: 'Evaluation Progress Report', desc: 'Answer-sheet evaluation status across all subjects' },
  exams: { title: 'Exam Summary Report', desc: 'Active exams, schedules, and room allocations' },
  performance: { title: 'Academic Performance Report', desc: 'Pass rates and subject-wise performance' },
  cheating: { title: 'AI Cheating Detection Report', desc: 'Flagged cases, risk levels, and resolutions' },
};

const FORMATS = [
  { id: 'excel', label: 'Excel (.xlsx)', icon: 'grid', color: '#059669' },
  { id: 'pdf', label: 'PDF', icon: 'document-text', color: '#dc2626' },
  { id: 'csv', label: 'CSV', icon: 'file-tray', color: '#0284c7' },
];

export default function ExportReport({ dataType, onBack }) {
  const [format, setFormat] = useState('excel');

  const report = REPORT_TYPES[dataType] || REPORT_TYPES.evaluation;

  const handleExport = () => {
    const fmt = FORMATS.find((f) => f.id === format);
    Alert.alert('Export Started', `${report.title} will be downloaded as ${fmt.label}.`);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#7c3aed" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Export Report</Text>
            <Text style={styles.headerSubtitle}>Generate and download institution data</Text>
          </View>
        </View>

        <View style={styles.reportCard}>
          <View style={styles.reportIcon}>
            <Ionicons name="analytics" size={22} color="#7c3aed" />
          </View>
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportDesc}>{report.desc}</Text>
        </View>

        <Text style={styles.sectionLabel}>Choose Format</Text>
        {FORMATS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.formatCard, format === f.id && styles.formatCardActive]}
            onPress={() => setFormat(f.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.formatIcon, { backgroundColor: f.color + '1A' }]}>
              <Ionicons name={f.icon} size={18} color={f.color} />
            </View>
            <Text style={styles.formatLabel}>{f.label}</Text>
            <Ionicons
              name={format === f.id ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={format === f.id ? '#7c3aed' : '#cbd5e1'}
            />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Options</Text>
        <View style={styles.optionsCard}>
          <View style={styles.optionRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.optionLabel}>Include date range</Text>
            <Text style={styles.optionValue}>2026-27 Academic Year</Text>
          </View>
          <View style={styles.optionRow}>
            <Ionicons name="layers-outline" size={16} color="#64748b" />
            <Text style={styles.optionLabel}>Summary only</Text>
            <Text style={styles.optionValue}>On</Text>
          </View>
        </View>

        <ActionButton label="Download Report" icon="download" onPress={handleExport} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  reportCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  reportTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
  },
  reportDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#7c3aed',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.sm,
  },
  formatCardActive: {
    borderColor: '#7c3aed',
  },
  formatIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  formatLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#0f172a',
    fontFamily: 'Manrope-Medium',
  },
  optionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  optionLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#475569',
    fontFamily: 'Manrope-Regular',
    marginLeft: SPACING.sm,
  },
  optionValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
});