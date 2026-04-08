import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function ProgressOverviewBento({ velocity, allocation }) {
  // SVG calculations for Subject Allocation Circle
  const size = 120; // Reduced size
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI; 
  
  const stemOffset = circumference * 0.25; 
  const artsOffset = circumference * 0.75; 

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
                  backgroundColor: index === 4 ? COLORS.primary : COLORS.gray100,
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
              stroke={COLORS.gray100}
              fill="transparent"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
            />
            {/* STEM Circle */}
            <Circle
              stroke={COLORS.primary}
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
              stroke={COLORS.accent}
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
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>STEM</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.legendText}>Arts</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  velocityCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  bgShape: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderBottomLeftRadius: 100,
  },
  velocityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  velocityLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginBottom: 4,
  },
  velocityValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  trendBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  trendText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    marginTop: 'auto',
  },
  bar: {
    width: 12,
    borderRadius: BORDER_RADIUS.sm,
  },
  activeBar: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  allocationCard: {
    flex: 0.8,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  allocationLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.sm,
  },
  innerCircleContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
  },
  taskLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 'auto',
    paddingTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.gray600,
    fontWeight: '500',
  },
});
