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

          <View style={styles.block}>
            <SectionHeader title="Institution Performance" subtitle="Pass rate by department • 2025-26" />
            <View style={styles.chartCard}>
              {[
                { name: 'Computer Science', pct: 92, color: '#2563eb' },
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
          </View>

          <View style={styles.block}>
            <SectionHeader title="Quick Insights" subtitle="Key metrics at a glance" />
            <View style={styles.insightsGrid}>
              <View style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: '#05966914' }]}>
                  <Ionicons name="trending-up" size={18} color="#059669" />
                </View>
                <Text style={styles.insightValue}>+2.1%</Text>
                <Text style={styles.insightLabel}>Pass rate improved</Text>
              </View>
              <View style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: '#dc262614' }]}>
                  <Ionicons name="warning" size={18} color="#dc2626" />
                </View>
                <Text style={styles.insightValue}>14</Text>
                <Text style={styles.insightLabel}>Students at risk</Text>
              </View>
              <View style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: '#d9770614' }]}>
                  <Ionicons name="flash" size={18} color="#d97706" />
                </View>
                <Text style={styles.insightValue}>3</Text>
                <Text style={styles.insightLabel}>Underperforming classes</Text>
              </View>
              <View style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: '#2563eb14' }]}>
                  <Ionicons name="ribbon" size={18} color="#2563eb" />
                </View>
                <Text style={styles.insightValue}>38</Text>
                <Text style={styles.insightLabel}>Toppers (9+ CGPA)</Text>
              </View>
            </View>
          </View>
        </>
      ) : null}

      {tab === 'classes' ? (
        <View style={styles.block}>
          <SectionHeader title="Class Reports" subtitle="Academic reports for every class" actionLabel="Generate All" actionIcon="download" onAction={() => Alert.alert('Export', 'All class reports will be exported as PDF bundle.')} />
          {CLASS_REPORTS.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={styles.classCard}
              onPress={() => setSelectedClass(cls)}
              activeOpacity={0.85}
            >
              <View style={[styles.classIcon, { backgroundColor: cls.color + '14' }]}>
                <Ionicons name="people" size={20} color={cls.color} />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.classMeta}>{cls.students} students • {cls.teacher}</Text>
                <View style={styles.classChips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>Att {cls.attendance}%</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: '#05966914' }]}>
                    <Text style={[styles.chipText, { color: '#059669' }]}>Pass {cls.passRate}%</Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: '#2563eb14' }]}>
                    <Text style={[styles.chipText, { color: '#2563eb' }]}>CGPA {cls.avgCgpa}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {tab === 'export' ? (
        <View style={styles.block}>
          <SectionHeader title="Export Center" subtitle="Generate institution reports in Excel or PDF" />
          {EXPORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.exportCard}
              onPress={() => handleExport(option)}
              activeOpacity={0.85}
            >
              <View style={[styles.exportIcon, { backgroundColor: option.color + '14' }]}>
                <Ionicons name={option.icon} size={20} color={option.color} />
              </View>
              <View style={styles.exportInfo}>
                <Text style={styles.exportTitle}>{option.label}</Text>
                <Text style={styles.exportDesc} numberOfLines={1}>{option.desc}</Text>
              </View>
              <Ionicons name="download-outline" size={20} color="#0050d4" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  block: {
    marginTop: 24,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deptName: {
    width: 120,
    fontSize: 11,
    color: '#475569',
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
  },
  deptTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#eef1f3',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  deptFill: {
    height: '100%',
    borderRadius: 4,
  },
  deptPct: {
    width: 40,
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Manrope-Bold',
    textAlign: 'right',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  insightLabel: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  classIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  classMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  classChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 5,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: '#eef1f3',
  },
  chipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'Manrope-Bold',
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  exportIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  exportDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});