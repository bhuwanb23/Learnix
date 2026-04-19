import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export default function ClassPulse({ pulseData }) {
  const { title, legend, days, data } = pulseData;

  // Convert data points to SVG path
  const width = 400;
  const height = 100;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - (value / 100) * height;
    return { x, y };
  });

  // Create smooth curve path
  let pathD = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 3;
    const cpx2 = curr.x - (curr.x - prev.x) / 3;
    pathD += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
  }

  // Create fill path
  const fillD = `${pathD} V${height} H0 Z`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.legend}>
          {legend.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: item.color }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            <Defs>
              <LinearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#0050d4" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#0050d4" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d={fillD} fill="url(#grad1)" />
            <Path
              d={pathD}
              fill="none"
              stroke="#0050d4"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {points.slice(1, -1).map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill="#0050d4"
              />
            ))}
          </Svg>
        </View>
        <View style={styles.daysRow}>
          {days.map((day, index) => (
            <Text key={index} style={styles.dayText}>
              {day}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '800',
    color: '#2c2f31',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    height: 256,
  },
  chart: {
    flex: 1,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  dayText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 2,
  },
});
