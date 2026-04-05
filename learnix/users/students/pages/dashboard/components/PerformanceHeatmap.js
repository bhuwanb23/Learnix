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
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  content: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c2f31',
  },
  weeksContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  weekBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
  },
});
