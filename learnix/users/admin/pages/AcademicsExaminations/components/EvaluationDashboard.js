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

export default function EvaluationDashboard({
  evaluationStats,
  subjectProgress,
  onViewDetails,
  onExportData,
}) {
  const renderProgressGauge = () => (
    <View style={styles.gaugeContainer}>
      <View style={styles.gauge}>
        <View style={styles.gaugeBackground} />
        <View style={[
          styles.gaugeProgress,
          { width: `${evaluationStats.progressPercentage}%` }
        ]} />
        <View style={styles.gaugeTextContainer}>
          <Text style={styles.gaugePercentage}>{evaluationStats.progressPercentage}%</Text>
          <Text style={styles.gaugeLabel}>Complete</Text>
        </View>
      </View>
    </View>
  );

  const renderStatCard = (title, value, color, bgColor) => (
    <View key={title} style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{title}</Text>
    </View>
  );

  const renderSubjectProgress = (subject) => (
    <View key={subject.id} style={styles.subjectItem}>
      <View style={styles.subjectHeader}>
        <Text style={styles.subjectName}>{subject.name}</Text>
        <Text style={styles.subjectPercentage}>{subject.progress}%</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground} />
        <View style={[
          styles.progressBarFill,
          { 
            width: `${subject.progress}%`,
            backgroundColor: subject.color,
          }
        ]} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="pie-chart-outline" size={20} color="#10b981" />
          </View>
          <View>
            <Text style={styles.title}>Digital Evaluation Dashboard</Text>
            <Text style={styles.subtitle}>Real-time progress tracking</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => onExportData && onExportData('evaluation')}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Gauge */}
        {renderProgressGauge()}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {renderStatCard(
            'Completed',
            evaluationStats.completed.toString(),
            '#10b981',
            '#dcfce7'
          )}
          {renderStatCard(
            'In Progress',
            evaluationStats.inProgress.toString(),
            '#f59e0b',
            '#fef3c7'
          )}
          {renderStatCard(
            'Pending',
            evaluationStats.pending.toString(),
            '#6b7280',
            '#f3f4f6'
          )}
        </View>

        {/* Subject-wise Progress */}
        <View style={styles.subjectsContainer}>
          <Text style={styles.subjectsTitle}>Subject-wise Progress</Text>
          <View style={styles.subjectsList}>
            {subjectProgress.map(renderSubjectProgress)}
          </View>
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
    backgroundColor: '#dcfce7',
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  menuButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  gauge: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gaugeBackground: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#e5e7eb',
  },
  gaugeProgress: {
    position: 'absolute',
    height: 180,
    borderRadius: 90,
    backgroundColor: '#10b981',
  },
  gaugeTextContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  gaugePercentage: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    fontFamily: 'Inter-Bold',
  },
  gaugeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'Inter-Bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  subjectsContainer: {
    marginBottom: SPACING.lg,
  },
  subjectsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    fontFamily: 'Inter-SemiBold',
    marginBottom: SPACING.md,
  },
  subjectsList: {
    gap: SPACING.md,
  },
  subjectItem: {
    marginBottom: SPACING.sm,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontFamily: 'Inter-Medium',
  },
  subjectPercentage: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    fontFamily: 'Inter-Medium',
  },
  progressBarContainer: {
    position: 'relative',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e5e7eb',
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.full,
  },
});
