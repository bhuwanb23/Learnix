import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS } from '../constants/dashboardData';

export default function AttendanceWidget({ attendanceData }) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Overview</Text>
        <View style={styles.liveIndicator}>
          <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          value={attendanceData.thisWeek}
          label="This Week"
          color={COLORS.green}
        />
        <StatCard
          value={attendanceData.thisMonth}
          label="This Month"
          color={COLORS.blue}
        />
        <StatCard
          value={attendanceData.overall}
          label="Overall"
          color={COLORS.purple}
        />
      </View>

      <AttendanceChart data={attendanceData.dailyData} />
    </View>
  );
}

function StatCard({ value, label, color }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color[50] }]}>
      <Text style={[styles.statValue, { color: color[600] }]}>{value}%</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AttendanceChart({ data }) {
  const maxValue = Math.max(...data.map(item => item.percentage));

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chart}>
        {data.map((item, index) => (
          <BarItem
            key={index}
            item={item}
            maxValue={maxValue}
            index={index}
          />
        ))}
      </View>
      <View style={styles.chartLabels}>
        {data.map((item, index) => (
          <Text key={index} style={styles.chartLabel}>{item.day}</Text>
        ))}
      </View>
    </View>
  );
}

function BarItem({ item, maxValue, index }) {
  const height = (item.percentage / maxValue) * 60; // Max height 60

  return (
    <View style={styles.barContainer}>
      <View
        style={[
          styles.bar,
          {
            height: height,
            backgroundColor: COLORS.blue[500],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green[500],
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.green[600],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  chartContainer: {
    height: 80,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
    marginBottom: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.gray[500],
    marginHorizontal: 2,
  },
});
