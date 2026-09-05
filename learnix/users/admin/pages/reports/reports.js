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

import { REPORT_STATS, CLASS_REPORTS, EXPORT_OPTIONS } from './constants/reportsData';

import StatCard from '../../components/ui/StatCard';
import SectionHeader from '../../components/ui/SectionHeader';

import ClassReport from './pages/class_report/class_report';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'classes', label: 'Class Reports' },
  { id: 'export', label: 'Export Center' },
];

export default function ReportsModule({ navigation }) {
  const [tab, setTab] = useState('overview');
  const [selectedClass, setSelectedClass] = useState(null);

  if (selectedClass) {
    return <ClassReport classReport={selectedClass} onBack={() => setSelectedClass(null)} />;
  }

  const handleExport = (option) => {
    Alert.alert('Export', `${option.label} will be generated and downloaded as Excel/PDF.`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          <View style={styles.statsRow}>
            {REPORT_STATS.map((stat) => (
              <StatCard
                key={stat.id}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                subtitle={stat.trend}
                color={stat.color}
              />
            ))}
          </View>

          <SectionHeader title="Institution Performance" />
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Pass Rate by Department</Text>
              <Text style={styles.chartPeriod}>2025-26</Text>
            </View>
            {[
              { name: 'Computer Science', pct: 92, color: '#7c3aed' },
              { name: 'Electronics', pct: 88, color: '#059669' },
              { name: 'Mechanical', pct: 84, color: '#d97706' },
              { name: 'Management', pct: 91, color: '#dc2626' },
              { name: 'Civil', pct: 86, color: '#0891b2' },
            ].map((dept) => (
              <View key={dept.name} style={styles.deptRow}>
                <Text style={styles.deptName}>{dept.name}</Text>
                <View style={styles.deptTrack}>
                  <View style={[styles.deptFill, { width: `${dept.pct}%`, backgroundColor: dept.color }]} />
                </View>
                <Text style={styles.deptPct}>{dept.pct}%</Text>
              </View>
            ))}
          </View>

          <SectionHeader title="Quick Insights" />
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <Ionicons name="trending-up" size={18} color="#059669" />
              <Text style={styles.insightValue}>+2.1%</Text>
              <Text style={styles.insightLabel}>Pass rate improved</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="warning" size={18} color="#dc2626" />
              <Text style={styles.insightValue}>14</Text>
              <Text style={styles.insightLabel}>Students at risk</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="flash" size={18} color="#d97706" />
              <Text style={styles.insightValue}>3</Text>
              <Text style={styles.insightLabel}>Underperforming classes</Text>
            </View>
            <View style={styles.insightCard}>
              <Ionicons name="ribbon" size={18} color="#7c3aed" />
              <Text style={styles.insightValue}>38</Text>
              <Text style={styles.insightLabel}>Toppers (9+ CGPA)</Text>
            </View>
          </View>
        </>
      ) : null}

      {tab === 'classes' ? (
        <>
          <SectionHeader title="Class Reports" actionLabel="Generate All" actionIcon="download" onAction={() => Alert.alert('Export', 'All class reports will be exported as PDF bundle.')} />
          {CLASS_REPORTS.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={styles.classCard}
              onPress={() => setSelectedClass(cls)}
              activeOpacity={0.8}
            >
              <View style={[styles.classIcon, { backgroundColor: cls.color + '1A' }]}>
                <Ionicons name="people" size={20} color={cls.color} />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.classMeta}>{cls.students} students • {cls.teacher}</Text>
                <View style={styles.classChips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>Att {cls.attendance}%</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: '#0596691A' }]}>
                    <Text style={[styles.chipText, { color: '#059669' }]}>Pass {cls.passRate}%</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: '#7c3aed1A' }]}>
                    <Text style={[styles.chipText, { color: '#7c3aed' }]}>CGPA {cls.avgCgpa}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {tab === 'export' ? (
        <>
          <SectionHeader title="Export Center" />
          <Text style={styles.exportHint}>Generate institution reports in Excel or PDF format.</Text>
          {EXPORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.exportCard}
              onPress={() => handleExport(option)}
              activeOpacity={0.8}
            >
              <View style={[styles.exportIcon, { backgroundColor: option.color + '1A' }]}>
                <Ionicons name={option.icon} size={20} color={option.color} />
              </View>
              <View style={styles.exportInfo}>
                <Text style={styles.exportTitle}>{option.label}</Text>
                <Text style={styles.exportDesc} numberOfLines={1}>{option.desc}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color="#7c3aed" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ScrollView>
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.xl,
    padding: 4,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
  },
  activeTabText: {
    color: '#7c3aed',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  chartTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  chartPeriod: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  deptName: {
    width: 120,
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
  },
  deptTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: SPACING.sm,
  },
  deptFill: {
    height: '100%',
    borderRadius: 4,
  },
  deptPct: {
    width: 40,
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'right',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  insightCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  insightValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 4,
  },
  insightLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  classMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  classChips: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#f1f5f9',
  },
  chipText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#475569',
    fontFamily: 'Manrope-SemiBold',
  },
  exportHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.md,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  exportIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  exportDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});