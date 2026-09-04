import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function OverviewCards({ overview, subjectName, classLabel, color }) {
  const trendDown = overview.classAverage.trend.startsWith('-');
  const trendColor = trendDown ? '#b31b25' : '#16a34a';
  const maxCount = Math.max(1, ...overview.distribution.map((bucket) => bucket.count));

  return (
    <View style={styles.container}>
      {/* Context */}
      <View style={styles.contextRow}>
        <View style={[styles.subjectDot, { backgroundColor: color }]} />
        <Text style={styles.contextTitle} numberOfLines={1}>
          {subjectName} · {classLabel}
        </Text>
        <View style={styles.riskBadge}>
          <Text style={styles.riskText}>{overview.atRisk} at risk</Text>
        </View>
      </View>

      {/* Class Average */}
      <View style={styles.averageCard}>
        <View>
          <View style={styles.averageHeader}>
            <MaterialIcons name="analytics" size={18} color={color} />
            <Text style={styles.averageLabel}>Class Average</Text>
          </View>
          <View style={styles.averageValue}>
            <Text style={styles.averageNumber}>{overview.classAverage.value}%</Text>
            <View style={[styles.trendChip, { backgroundColor: `${trendColor}1a` }]}>
              <MaterialIcons
                name={trendDown ? 'trending-down' : 'trending-up'}
                size={13}
                color={trendColor}
              />
              <Text style={[styles.trendText, { color: trendColor }]}>
                {overview.classAverage.trend}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.countWrap}>
          <Text style={styles.countValue}>{overview.total}</Text>
          <Text style={styles.countLabel}>students</Text>
        </View>
      </View>

      {/* Attendance & Participation */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="event-available" size={24} color="#702ae1" />
          <Text style={styles.statValue}>{overview.attendanceRate.value}%</Text>
          <Text style={styles.statLabel}>{overview.attendanceRate.label}</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="forum" size={24} color="#a23800" />
          <Text style={styles.statValue}>
            {overview.participation.value}/{overview.participation.max}
          </Text>
          <Text style={styles.statLabel}>{overview.participation.label}</Text>
        </View>
      </View>

      {/* Grade Distribution */}
      <View style={styles.distributionCard}>
        <Text style={styles.distributionTitle}>Grade Distribution</Text>
        <View style={styles.barsRow}>
          {overview.distribution.map((bucket) => (
            <View key={bucket.label} style={styles.bucket}>
              <View style={styles.bucketBarTrack}>
                <View
                  style={[
                    styles.bucketBarFill,
                    {
                      height: `${(bucket.count / maxCount) * 100}%`,
                      backgroundColor: bucket.count > 0 ? color : '#e5e8ec',
                    },
                  ]}
                />
              </View>
              <Text style={styles.bucketCount}>{bucket.count}</Text>
              <Text style={styles.bucketLabel}>{bucket.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  contextTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#2c2f31',
  },
  riskBadge: {
    backgroundColor: '#fde3e5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#b31b25',
  },
  averageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#e5e8ec',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  averageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  averageLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#8a8f94',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  averageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  averageNumber: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 30,
    fontWeight: '700',
    color: '#2c2f31',
    letterSpacing: -0.5,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trendText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  countWrap: {
    alignItems: 'flex-end',
  },
  countValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2f31',
  },
  countLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    color: '#8a8f94',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e8ec',
  },
  statValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2f31',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    color: '#8a8f94',
  },
  distributionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e8ec',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  distributionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 14,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bucket: {
    flex: 1,
    alignItems: 'center',
  },
  bucketBarTrack: {
    width: '100%',
    height: 64,
    backgroundColor: '#f5f7f9',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bucketBarFill: {
    width: '100%',
    borderRadius: 6,
    opacity: 0.9,
  },
  bucketCount: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#2c2f31',
    marginTop: 6,
  },
  bucketLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 9,
    color: '#8a8f94',
    marginTop: 1,
  },
});