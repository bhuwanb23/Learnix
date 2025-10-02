import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

const { width } = Dimensions.get('window');

export default function PerformanceAnalytics({ 
  data = [
    { day: 'Mon', score: 85 },
    { day: 'Tue', score: 88 },
    { day: 'Wed', score: 82 },
    { day: 'Thu', score: 90 },
    { day: 'Fri', score: 87 },
    { day: 'Sat', score: 92 },
    { day: 'Sun', score: 89 },
  ]
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const chartAnims = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate chart bars
      Animated.stagger(100, 
        chartAnims.map((anim, index) =>
          Animated.timing(anim, {
            toValue: data[index].score,
            duration: 800,
            useNativeDriver: false,
          })
        )
      ).start();
    });
  }, []);

  const maxScore = Math.max(...data.map(item => item.score));
  const chartHeight = 120;

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <Text style={styles.title}>Performance Analytics</Text>
      
      <View style={styles.card}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.cardGradient}
        >
          {/* Chart Container */}
          <View style={styles.chartContainer}>
            <View style={styles.chart}>
              {/* Y-axis labels */}
              <View style={styles.yAxis}>
                {[95, 90, 85, 80].map((value, index) => (
                  <View key={index} style={styles.yAxisItem}>
                    <Text style={styles.yAxisLabel}>{value}</Text>
                    <View style={styles.gridLine} />
                  </View>
                ))}
              </View>
              
              {/* Chart bars */}
              <View style={styles.barsContainer}>
                {data.map((item, index) => (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barContainer}>
                      <Animated.View
                        style={[
                          styles.bar,
                          {
                            height: chartAnims[index].interpolate({
                              inputRange: [0, maxScore],
                              outputRange: [0, chartHeight],
                              extrapolate: 'clamp',
                            }),
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={['#3B82F6', '#2563EB']}
                          style={styles.barGradient}
                        />
                      </Animated.View>
                    </View>
                    <Text style={styles.xAxisLabel}>{item.day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          {/* Stats Summary */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {Math.round(data.reduce((sum, item) => sum + item.score, 0) / data.length)}
              </Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.max(...data.map(item => item.score))}</Text>
              <Text style={styles.statLabel}>Best Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {data.filter(item => item.score >= 85).length}
              </Text>
              <Text style={styles.statLabel}>Good Days</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: SPACING.lg,
  },
  chartContainer: {
    marginBottom: SPACING.lg,
  },
  chart: {
    flexDirection: 'row',
    height: 150,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingRight: SPACING.xs,
  },
  yAxisItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    width: 20,
    textAlign: 'right',
  },
  gridLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: SPACING.xs,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xs,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 120,
    width: 20,
    justifyContent: 'flex-end',
    marginBottom: SPACING.xs,
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 2,
  },
  barGradient: {
    flex: 1,
  },
  xAxisLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#3B82F6',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
});
