import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DAYS_LABELS } from '../constants/dashboardData';

const PULSE_DATA = [58, 74, 91, 68, 82, 45, 30];

export default function ClassPulse() {
  return (
    <View style={styles.pulseSection}>
      <View style={styles.pulseHeader}>
        <Text style={styles.sectionTitle}>Class Pulse</Text>
        <View style={styles.pulseLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0050d4' }]} />
            <Text style={styles.legendText}>Engagement</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#702ae1' }]} />
            <Text style={[styles.legendText, { color: '#702ae1' }]}>Avg 71%</Text>
          </View>
        </View>
      </View>
      <View style={styles.pulseChart}>
        <View style={styles.chartBars}>
          {PULSE_DATA.map((value, index) => (
            <View key={index} style={styles.barColumn}>
              <Text style={styles.barValue}>{value}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${value}%`,
                      backgroundColor: index === 2 ? '#0050d4' : 'rgba(0, 80, 212, 0.35)',
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.chartLabels}>
          {DAYS_LABELS.map((day, index) => (
            <Text key={index} style={styles.dayLabel}>{day}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pulseSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#e5e9eb',
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 12,
  },
  pulseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  pulseLegend: {
    flexDirection: 'row',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#0050d4',
  },
  pulseChart: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#8a8f94',
    marginBottom: 4,
  },
  barTrack: {
    width: '100%',
    height: 90,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(89, 92, 94, 0.06)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 6,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dayLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
});