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

import { REPORT_STATS, CASH_FLOW, REPORT_TYPES } from './constants/reportsData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function ReportsModule({ navigation }) {
  const [format, setFormat] = useState('PDF');

  const handleExport = (report) => {
    Alert.alert(
      'Export Report',
      `Export "${report.name}" as ${format}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => Alert.alert('Export Started', `${report.name}.${format.toLowerCase()} will download shortly.`) },
      ]
    );
  };

  const maxInflow = Math.max(...CASH_FLOW.map((c) => c.inflow));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {REPORT_STATS.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Cash flow */}
      <Text style={styles.sectionLabel}>Cash Flow (₹ Lakhs)</Text>
      <View style={styles.chartCard}>
        <View style={styles.chartRow}>
          <Text style={styles.chartLegendIn}>Inflow</Text>
          <View style={styles.chartBars}>
            {CASH_FLOW.map((item) => (
              <View key={item.id} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${(item.inflow / maxInflow) * 100}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={styles.barLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.chartDivider} />
        <View style={styles.chartRow}>
          <Text style={styles.chartLegendOut}>Outflow</Text>
          <View style={styles.chartBars}>
            {CASH_FLOW.map((item) => (
              <View key={item.id} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${(item.outflow / maxInflow) * 100}%`, backgroundColor: '#fca5a5' }]} />
                </View>
                <Text style={styles.barLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Export format */}
      <View style={styles.formatRow}>
        <Text style={styles.formatLabel}>Export format:</Text>
        {['PDF', 'CSV', 'Excel'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.formatChip, format === f && styles.formatChipActive]}
            onPress={() => setFormat(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.formatText, format === f && styles.formatTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Report types */}
      <Text style={styles.sectionLabel}>Available Reports</Text>
      {REPORT_TYPES.map((report) => (
        <TouchableOpacity
          key={report.id}
          style={styles.reportCard}
          activeOpacity={0.8}
          onPress={() => handleExport(report)}
        >
          <View style={[styles.reportIcon, { backgroundColor: report.color + '14' }]}>
            <Ionicons name={report.icon} size={18} color={report.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportName}>{report.name}</Text>
            <Text style={styles.reportDesc}>{report.desc}</Text>
          </View>
          <Ionicons name="download-outline" size={18} color="#2563eb" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
    marginBottom: 20,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartLegendIn: {
    width: 48,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Manrope-Bold',
  },
  chartLegendOut: {
    width: 48,
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    fontFamily: 'Manrope-Bold',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 90,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    maxWidth: 22,
    justifyContent: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Manrope-Medium',
    marginTop: 4,
  },
  chartDivider: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginVertical: 14,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  formatLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginRight: 4,
  },
  formatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formatChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  formatText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  formatTextActive: {
    color: '#FFFFFF',
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  reportDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});