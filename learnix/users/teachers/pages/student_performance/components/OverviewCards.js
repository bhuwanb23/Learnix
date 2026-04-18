import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function OverviewCards({ overview }) {
  return (
    <View style={styles.container}>
      {/* Class Average Card */}
      <View style={styles.averageCard}>
        <View>
          <View style={styles.averageHeader}>
            <MaterialIcons name="analytics" size={20} color="#0050d4" />
            <Text style={styles.averageLabel}>Class Average</Text>
          </View>
          <View style={styles.averageValue}>
            <Text style={styles.averageNumber}>{overview.classAverage.value}%</Text>
            <View style={styles.trend}>
              <MaterialIcons name="trending-up" size={20} color="#702ae1" />
              <Text style={styles.trendText}>{overview.classAverage.trend}</Text>
            </View>
          </View>
        </View>
        <View style={styles.chart}>
          {overview.classAverage.chartData.map((value, index) => (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: `${value}%`,
                  backgroundColor: value >= 80 ? '#0050d4' : `rgba(0, 80, 212, ${0.2 + (value / 100) * 0.3})`,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Attendance & Participation */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="event-available" size={36} color="#702ae1" />
          <Text style={styles.statValue}>{overview.attendanceRate.value}%</Text>
          <Text style={styles.statLabel}>{overview.attendanceRate.label}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="forum" size={36} color="#a23800" />
          <Text style={styles.statValue}>{overview.participation.value}/{overview.participation.max}</Text>
          <Text style={styles.statLabel}>{overview.participation.label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  averageCard: {
    backgroundColor: '#eef1f3',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  averageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  averageLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#595c5e',
  },
  averageValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  averageNumber: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 48,
    fontWeight: '800',
    color: '#0050d4',
    letterSpacing: -1,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#702ae1',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
    marginTop: 24,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#abadaf1a',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '800',
    color: '#2c2f31',
    marginTop: 12,
  },
  statLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
});
