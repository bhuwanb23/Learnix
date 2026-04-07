import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function ProgressOverviewBento({ velocity, allocation }) {
  return (
    <View style={styles.container}>
      {/* Weekly Velocity Card */}
      <View style={styles.velocityCard}>
        <View style={styles.bgShape} />
        
        <View style={styles.velocityHeader}>
          <View>
            <Text style={styles.velocityLabel}>Weekly Velocity</Text>
            <Text style={styles.velocityValue}>{velocity.percentage}%</Text>
          </View>
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>{velocity.trend}</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={styles.chartContainer}>
          {velocity.chart.map((height, index) => (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: `${height}%`,
                  backgroundColor: index === 4 ? '#0050d4' : '#eef1f3',
                  ...(index === 4 && styles.activeBar),
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Subject Allocation Circle */}
      <View style={styles.allocationCard}>
        <Text style={styles.allocationLabel}>Subject Allocation</Text>
        
        <View style={styles.circleContainer}>
          {/* Simplified circular progress representation */}
          <View style={styles.outerCircle}>
            <View style={styles.innerCircle}>
              <Text style={styles.taskCount}>{allocation.totalTasks}</Text>
              <Text style={styles.taskLabel}>Tasks</Text>
            </View>
          </View>
        </View>

        <View style={styles.legend}>
          {allocation.categories.map((category, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: category.color }]} />
              <Text style={styles.legendText}>{category.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 32,
    flexDirection: 'row',
    gap: 24,
  },
  velocityCard: {
    flex: 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  bgShape: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(0, 80, 212, 0.05)',
  },
  velocityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  velocityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'Manrope-SemiBold',
  },
  velocityValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0050d4',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  trendBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(123, 156, 255, 0.2)',
    borderRadius: 12,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 128,
    gap: 8,
    paddingHorizontal: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 8,
    minHeight: '20%',
  },
  activeBar: {
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  allocationCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
    fontFamily: 'Manrope-SemiBold',
  },
  circleContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: '#dfe3e6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  innerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  taskLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    marginTop: 2,
    fontFamily: 'Manrope-Bold',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
  },
});
