import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

export default function AttendanceWidget({ attendanceData }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <View style={styles.content}>
        {/* Circular Progress */}
        <View style={styles.circularSection}>
          <CircularProgress percentage={attendanceData.percentage} />
        </View>

        {/* Bar Chart */}
        <View style={styles.chartSection}>
          <BarChart data={attendanceData.dailyData} />
        </View>
      </View>
    </Animated.View>
  );
}

function CircularProgress({ percentage }) {
  const size = 128;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.circularContainer}>
      <View style={{ width: size, height: size }}>
        {/* Background circle */}
        <View
          style={[
            styles.circleBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: '#e5e9eb',
            },
          ]}
        />
        {/* Progress circle */}
        <View
          style={[
            styles.circleProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: '#0050d4',
              position: 'absolute',
              top: 0,
              left: 0,
            },
          ]}
        />
      </View>
      <View style={styles.percentageContainer}>
        <Text style={styles.percentageText}>{percentage}%</Text>
        <Text style={styles.attendanceLabel}>Attendance</Text>
      </View>
    </View>
  );
}

function BarChart({ data }) {
  return (
    <View style={styles.chartContainer}>
      <View style={styles.bars}>
        {data.map((item, index) => (
          <View key={index} style={styles.barWrapper}>
            <View 
              style={[
                styles.bar, 
                { 
                  height: item.height,
                  backgroundColor: index % 2 === 0 ? 'rgba(0, 80, 212, 0.2)' : '#0050d4'
                }
              ]} 
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((item, index) => (
          <Text key={index} style={styles.label}>{item.day}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    gap: 16,
  },
  circularSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBackground: {
    position: 'absolute',
  },
  circleProgress: {
    position: 'absolute',
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c2f31',
  },
  attendanceLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
  },
  chartSection: {
    flex: 1.5,
    justifyContent: 'flex-end',
  },
  chartContainer: {
    height: 110,
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    gap: 5,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 5,
    minHeight: 6,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: '#595c5e',
  },
});
