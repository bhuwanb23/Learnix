import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function AICheatingDetection({
  detectionStats,
  alerts,
  onAlertAction,
  onViewAllAlerts,
}) {
  const renderDetectionCard = (stat, index) => (
    <View key={index} style={[styles.detectionCard, { backgroundColor: stat.bgColor }]}>
      <View style={styles.detectionHeader}>
        <Ionicons name="time-outline" size={16} color={stat.color} />
        <Text style={[styles.detectionTitle, { color: stat.color }]}>
          {stat.label}
        </Text>
      </View>
      <Text style={[styles.detectionValue, { color: stat.color }]}>
        {stat.count}
      </Text>
      <Text style={[styles.detectionSubtitle, { color: stat.color }]}>
        {stat.subtitle}
      </Text>
    </View>
  );

  const renderAlertItem = (alert) => (
    <View key={alert.id} style={[styles.alertItem, { 
      backgroundColor: alert.bgColor,
      borderColor: alert.borderColor,
    }]}>
      <View style={styles.alertLeft}>
        <Image source={{ uri: alert.studentAvatar }} style={styles.alertAvatar} />
        <View style={styles.alertInfo}>
          <Text style={styles.alertStudentName}>{alert.studentName}</Text>
          <Text style={[styles.alertIssue, { color: alert.riskColor }]}>
            {alert.issue}
          </Text>
        </View>
      </View>
      
      <View style={styles.alertRight}>
        <View style={[styles.riskBadge, { backgroundColor: alert.bgColor }]}>
          <Text style={[styles.riskText, { color: alert.riskColor }]}>
            {alert.riskLevel}
          </Text>
        </View>
        
        <View style={styles.alertActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAlertAction && onAlertAction(alert.id, 'investigate')}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAlertAction && onAlertAction(alert.id, 'dismiss')}
            activeOpacity={0.7}
          >
            <Ionicons name="close-outline" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const getDetectionStats = () => [
    {
      label: 'Timing Analysis',
      count: detectionStats.timingAnalysis.count,
      subtitle: detectionStats.timingAnalysis.label,
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    {
      label: 'Answer Similarity',
      count: detectionStats.answerSimilarity.count,
      subtitle: detectionStats.answerSimilarity.label,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-outline" size={20} color="#ef4444" />
          </View>
          <View>
            <Text style={styles.title}>AI Cheating Detection</Text>
            <Text style={styles.subtitle}>Real-time malpractice monitoring</Text>
          </View>
        </View>
        
        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>{alerts.length} Alerts</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Detection Stats */}
        <View style={styles.detectionStatsContainer}>
          {getDetectionStats().map(renderDetectionCard)}
        </View>

        {/* Recent Alerts */}
        <View style={styles.alertsContainer}>
          <View style={styles.alertsHeader}>
            <Text style={styles.alertsTitle}>Recent Detection Alerts</Text>
            <TouchableOpacity
              onPress={() => onViewAllAlerts && onViewAllAlerts()}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.alertsList}>
            {alerts.map(renderAlertItem)}
          </View>
        </View>

        {/* AI Insights */}
        <View style={styles.insightsContainer}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#2563eb" />
            <View style={styles.insightsContent}>
              <Text style={styles.insightsTitle}>AI Insights</Text>
              <Text style={styles.insightsDescription}>
                Detection accuracy improved by 15% this week. Consider reviewing flagged patterns for false positives.
              </Text>
            </View>
          </View>
        </View>
      </View>
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
    backgroundColor: '#fef2f2',
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
  alertBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#ef4444',
    fontFamily: 'Manrope-Medium',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  detectionStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  detectionCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginLeft: SPACING.xs,
  },
  detectionValue: {
    fontSize: 20,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  detectionSubtitle: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
  },
  alertsContainer: {
    marginBottom: SPACING.lg,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  alertsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#2563eb',
    fontFamily: 'Manrope-Medium',
  },
  alertsList: {
    gap: SPACING.sm,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  alertInfo: {
    flex: 1,
  },
  alertStudentName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    fontFamily: 'Manrope-Medium',
    marginBottom: 2,
  },
  alertIssue: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  riskBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xs,
  },
  riskText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: 'Manrope-Medium',
  },
  alertActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  insightsContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightsContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  insightsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#2563eb',
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: SPACING.xs,
  },
  insightsDescription: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Manrope-Medium',
    lineHeight: 16,
  },
});
