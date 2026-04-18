import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PerformanceOverview({ performance }) {
  const { attendanceStats, averageAttendance } = performance;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Class Performance Overview</Text>
          <Text style={styles.subtitle}>Real-time analytical breakdown across your active sections</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Attendance Trends */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Attendance Trends</Text>
          <View style={styles.barChart}>
            {attendanceStats.map((stat, index) => (
              <View key={index} style={styles.barItem}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${stat.percentage}%`,
                      backgroundColor: stat.percentage >= 90 ? '#7b9cff' : 'rgba(123, 156, 255, 0.3)',
                    }
                  ]} 
                />
                <Text style={styles.dayLabel}>{stat.day}</Text>
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Average Attendance</Text>
            <Text style={styles.footerValue}>{averageAttendance}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.03,
    shadowRadius: 40,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#2c2f31',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  content: {
    gap: 24,
  },
  chartSection: {
    gap: 20,
  },
  chartTitle: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: 8,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 20,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#94a3b8',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(171, 173, 175, 0.1)',
  },
  footerLabel: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#64748b',
  },
  footerValue: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#0050d4',
  },
});
