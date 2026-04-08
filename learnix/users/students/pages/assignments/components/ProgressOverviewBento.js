import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function ProgressOverviewBento({ velocity, allocation }) {
  // SVG calculations for Subject Allocation Circle
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI; // ~465
  
  // HTML uses:
  // Total 440 (roughly circumference), STEM: dashoffset 110 (75%), Arts: dashoffset 330 (25%)
  const stemOffset = circumference * 0.25; // 75% filled (100 - 75)
  const artsOffset = circumference * 0.75; // 25% filled (100 - 25)

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

        {/* Stylized Line Graph Mockup (Bars) */}
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

      {/* Subject Breakdown Circle */}
      <View style={styles.allocationCard}>
        <Text style={styles.allocationLabel}>Subject Allocation</Text>
        
        <View style={styles.circleContainer}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Background Circle */}
            <Circle
              stroke="rgba(223, 227, 230, 0.2)" // text-surface-container-high/20
              fill="transparent"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            {/* STEM Circle */}
            <Circle
              stroke="#0050d4" // text-primary
              fill="transparent"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={stemOffset}
            />
            {/* Arts Circle */}
            <Circle
              stroke="#702ae1" // text-secondary
              fill="transparent"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={artsOffset}
            />
          </Svg>
          
          <View style={styles.innerCircleContent}>
            <Text style={styles.taskCount}>{allocation.totalTasks}</Text>
            <Text style={styles.taskLabel}>Tasks</Text>
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
    marginHorizontal: 24, // px-6
    marginTop: 32, // mt-8
    flexDirection: 'column', // grid-cols-1 md:grid-cols-12 -> stack for mobile
    gap: 24, // gap-6
  },
  velocityCard: {
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderRadius: 12, // rounded-xl
    padding: 32, // p-8
    shadowColor: '#2c2f31', // shadow
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
    right: -48, // -right-12
    top: -48, // -top-12
    width: 192, // w-48
    height: 192, // h-48
    borderRadius: 96, // rounded-full
    backgroundColor: 'rgba(0, 80, 212, 0.05)', // bg-primary/5
  },
  velocityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24, // mb-6
  },
  velocityLabel: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#595c5e', // text-on-surface-variant
    textTransform: 'uppercase',
    letterSpacing: 0.5, // tracking-wider
    marginBottom: 4, // mb-1
    fontFamily: 'Manrope-SemiBold',
  },
  velocityValue: {
    fontSize: 36, // text-4xl
    fontWeight: '800', // font-extrabold
    color: '#0050d4', // text-primary
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  trendBadge: {
    paddingHorizontal: 12, // px-3
    paddingVertical: 4, // py-1
    backgroundColor: 'rgba(123, 156, 255, 0.2)', // bg-primary-container/20
    borderRadius: 999, // rounded-full
  },
  trendText: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-primary
    fontFamily: 'Manrope-Bold',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 128, // h-32
    gap: 8, // gap-2
    paddingHorizontal: 8, // px-2
  },
  bar: {
    flex: 1,
    backgroundColor: '#eef1f3', // bg-surface-container-low
    borderTopLeftRadius: 8, // rounded-t-lg
    borderTopRightRadius: 8,
  },
  activeBar: {
    backgroundColor: '#0050d4', // bg-primary
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 4,
  },
  allocationCard: {
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    borderRadius: 12, // rounded-xl
    padding: 32, // p-8
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocationLabel: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#595c5e', // text-on-surface-variant
    textTransform: 'uppercase',
    letterSpacing: 0.5, // tracking-wider
    marginBottom: 24, // mb-6
    fontFamily: 'Manrope-SemiBold',
  },
  circleContainer: {
    width: 160, // w-40
    height: 160, // h-40
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  innerCircleContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCount: {
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface (assuming)
    fontFamily: 'PlusJakartaSans-Bold',
  },
  taskLabel: {
    fontSize: 10, // text-[10px]
    fontWeight: '700', // font-bold
    color: '#595c5e', // text-on-surface-variant
    textTransform: 'uppercase',
    fontFamily: 'Manrope-Bold',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16, // gap-4
    marginTop: 24, // mt-6
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  legendDot: {
    width: 8, // w-2
    height: 8, // h-2
    borderRadius: 4, // rounded-full
  },
  legendText: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface (assuming)
    fontFamily: 'Manrope-Bold',
  },
});
