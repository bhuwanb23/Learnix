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
        {/* Circular Progress - First */}
        <View style={styles.circularSection}>
          <CircularProgress percentage={attendanceData.percentage} />
        </View>

        {/* Bar Chart - Below */}
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
  const [animatedOffset, setAnimatedOffset] = React.useState(circumference);

  React.useEffect(() => {
    const targetOffset = circumference - (percentage / 100) * circumference;
    // Animate the progress circle
    const timeout = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 300);
    return () => clearTimeout(timeout);
  }, [percentage, circumference]);

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
              transform: [{ rotate: '-90deg' }],
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
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flexDirection: 'column',
    gap: 24,
  },
  circularSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  attendanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Manrope-Bold',
  },
  chartSection: {
    justifyContent: 'flex-end',
  },
  chartContainer: {
    height: 128,
  },
  bars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 8,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    fontFamily: 'Manrope-Bold',
  },
});
