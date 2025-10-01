import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

// Professional chart icon component
const ChartIcon = () => (
  <View style={styles.chartIcon}>
    <View style={styles.chartBars}>
      <View style={[styles.chartBar, styles.bar1]} />
      <View style={[styles.chartBar, styles.bar2]} />
      <View style={[styles.chartBar, styles.bar3]} />
      <View style={[styles.chartBar, styles.bar4]} />
    </View>
  </View>
);

export default function PerformanceWidget({ performanceData }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

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
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Trends</Text>
        <ChartIcon />
      </View>

      <PerformanceHeatmap data={performanceData} />

      <View style={styles.gradesContainer}>
        {performanceData.grades.map((grade, index) => (
          <GradeCard key={index} grade={grade} delay={index * 150} />
        ))}
      </View>
    </Animated.View>
  );
}

function PerformanceHeatmap({ data }) {
  const { subjects, weeks, heatmapData } = data;
  
  // Create a matrix for the heatmap
  const createHeatmapMatrix = () => {
    const matrix = [];
    subjects.forEach((subject, subjectIndex) => {
      const row = [];
      weeks.forEach((week, weekIndex) => {
        const item = heatmapData.find(
          d => d.subject === subject && d.week === week
        );
        row.push(item ? item.score : 0);
      });
      matrix.push(row);
    });
    return matrix;
  };

  const matrix = createHeatmapMatrix();

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 80) return '#f59e0b';
    if (score >= 70) return '#f97316';
    return '#ef4444';
  };

  return (
    <View style={styles.heatmapContainer}>
      <View style={styles.heatmap}>
        {matrix.map((row, subjectIndex) => (
          <View key={subjectIndex} style={styles.heatmapRow}>
            {row.map((score, weekIndex) => (
              <View
                key={weekIndex}
                style={[
                  styles.heatmapCell,
                  { backgroundColor: getScoreColor(score) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      
      <View style={styles.heatmapLabels}>
        <View style={styles.subjectLabels}>
          {subjects.map((subject, index) => (
            <Text key={index} style={styles.subjectLabel}>{subject}</Text>
          ))}
        </View>
        <View style={styles.weekLabels}>
          {weeks.map((week, index) => (
            <Text key={index} style={styles.weekLabel}>{week}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function GradeCard({ grade, delay = 0 }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getGradeColor = (color) => {
    const colorMap = {
      green: '#10b981',
      blue: '#2563eb',
      yellow: '#f59e0b',
    };
    return colorMap[color] || '#6b7280';
  };

  const gradeColor = getGradeColor(grade.color);

  return (
    <Animated.View style={[
      styles.gradeCard, 
      { borderLeftColor: gradeColor, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
    ]}>
      <Text style={[styles.gradeText, { color: gradeColor }]}>
        {grade.grade}
      </Text>
      <Text style={styles.gradeSubject}>{grade.subject}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  chartIcon: {
    width: 20,
    height: 20,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    gap: 1.5,
  },
  chartBar: {
    width: 3,
    backgroundColor: '#10b981',
    borderRadius: 1.5,
  },
  bar1: { height: 6 },
  bar2: { height: 12 },
  bar3: { height: 9 },
  bar4: { height: 16 },
  heatmapContainer: {
    marginBottom: 16,
  },
  heatmap: {
    marginBottom: 8,
  },
  heatmapRow: {
    flexDirection: 'row',
    marginBottom: 3,
    gap: 3,
  },
  heatmapCell: {
    flex: 1,
    height: 18,
    borderRadius: 4,
  },
  heatmapLabels: {
    flexDirection: 'row',
  },
  subjectLabels: {
    width: 50,
    paddingRight: 8,
  },
  subjectLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 3,
    height: 18,
    lineHeight: 18,
    fontWeight: '500',
  },
  weekLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekLabel: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    flex: 1,
    fontWeight: '500',
  },
  gradesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  gradeCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  gradeSubject: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
