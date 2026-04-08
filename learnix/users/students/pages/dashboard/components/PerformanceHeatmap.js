import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

export default function PerformanceHeatmap({ performanceData }) {
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
      <Text style={styles.title}>Subject Performance</Text>
      
      <View style={styles.content}>
        {performanceData.subjects.map((subject, index) => (
          <SubjectRow key={index} subject={subject} />
        ))}
      </View>
    </Animated.View>
  );
}

function SubjectRow({ subject }) {
  return (
    <View style={styles.row}>
      <Text style={styles.subjectName}>{subject.name}</Text>
      <View style={styles.weeksContainer}>
        {subject.weeks.map((weekColor, idx) => {
          const backgroundColor = getWeekColor(weekColor, subject.color);
          return (
            <View 
              key={idx} 
              style={[styles.weekBox, { backgroundColor }]} 
            />
          );
        })}
      </View>
    </View>
  );
}

function getWeekColor(colorKey, baseColor) {
  const colorMap = {
    'primary': baseColor,
    'primary/20': `${baseColor}33`,
    'tertiary': '#a23800',
    'tertiary/40': '#a2380066',
    'tertiary/20': '#a2380033',
    'error': '#b31b25',
    'error/40': '#b31b2566',
    'error/20': '#b31b2533',
    'error/10': '#b31b251A',
  };
  return colorMap[colorKey] || baseColor;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    fontFamily: 'Manrope-Bold',
  },
  content: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c2f31',
    fontFamily: 'Manrope-SemiBold',
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  weekBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});
