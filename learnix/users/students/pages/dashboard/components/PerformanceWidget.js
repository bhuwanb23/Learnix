import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../constants/dashboardData';

export default function PerformanceWidget({ performanceData }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Trends</Text>
        <Text style={styles.chartIcon}>📈</Text>
      </View>

      <PerformanceHeatmap data={performanceData} />

      <View style={styles.gradesContainer}>
        {performanceData.grades.map((grade, index) => (
          <GradeCard key={index} grade={grade} />
        ))}
      </View>
    </View>
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
    if (score >= 90) return COLORS.green[500];
    if (score >= 80) return COLORS.yellow[500];
    if (score >= 70) return COLORS.orange[500];
    return COLORS.red[500];
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

function GradeCard({ grade }) {
  const getGradeColor = (color) => {
    const colorMap = {
      green: COLORS.green,
      blue: COLORS.blue,
      yellow: COLORS.yellow,
    };
    return colorMap[color] || COLORS.gray;
  };

  const gradeColor = getGradeColor(grade.color);

  return (
    <View style={[styles.gradeCard, { backgroundColor: gradeColor[50] }]}>
      <Text style={[styles.gradeText, { color: gradeColor[600] }]}>
        {grade.grade}
      </Text>
      <Text style={styles.gradeSubject}>{grade.subject}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  chartIcon: {
    fontSize: 18,
    color: COLORS.green[500],
  },
  heatmapContainer: {
    marginBottom: 16,
  },
  heatmap: {
    marginBottom: 8,
  },
  heatmapRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  heatmapCell: {
    flex: 1,
    height: 20,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  heatmapLabels: {
    flexDirection: 'row',
  },
  subjectLabels: {
    width: 60,
    paddingRight: 8,
  },
  subjectLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
    textAlign: 'right',
    marginBottom: 4,
    height: 20,
    lineHeight: 20,
  },
  weekLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekLabel: {
    fontSize: 10,
    color: COLORS.gray[500],
    textAlign: 'center',
    flex: 1,
  },
  gradesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  gradeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gradeSubject: {
    fontSize: 12,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
});
