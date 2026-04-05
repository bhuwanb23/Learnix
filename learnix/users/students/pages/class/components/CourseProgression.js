import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';

const CircularProgress = ({ percentage, color }) => {
  const size = 64;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.progressContainer, { width: size, height: size }]}>
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
      {/* Progress circle - simplified representation */}
      <View
        style={[
          styles.circleProgress,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <Text style={[styles.percentageText, { color }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

export default function CourseProgression({ courses }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Course Progression</Text>
      
      {courses.map((course) => (
        <View
          key={course.id}
          style={[
            styles.courseCard,
            {
              backgroundColor: `${course.color}08`,
              borderColor: `${course.color}1a`,
            },
          ]}
        >
          <View style={styles.progressSection}>
            <CircularProgress percentage={course.progress} color={course.color} />
            <View style={[styles.gradeBadge, { backgroundColor: course.color }]}>
              <Text style={styles.gradeText}>{course.grade}</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.courseName}>{course.name}</Text>
            <View style={styles.professorInfo}>
              <Image
                source={{ uri: course.professorImage }}
                style={styles.professorImage}
              />
              <Text style={styles.professorName}>{course.professor}</Text>
            </View>
          </View>

          <View style={styles.milestoneBox}>
            <Text style={[styles.milestoneLabel, { color: course.color }]}>
              Next Milestone
            </Text>
            <Text style={styles.milestoneText}>
              {course.milestone.title}
              <Text style={styles.milestoneDate}> • {course.milestone.date}</Text>
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 16,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressSection: {
    alignItems: 'center',
    marginRight: 16,
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  circleBackground: {
    position: 'absolute',
  },
  circleProgress: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'Plus Jakarta Sans',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Manrope',
  },
  infoSection: {
    flex: 1,
  },
  courseName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 4,
  },
  professorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  professorImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  professorName: {
    fontSize: 13,
    color: '#595c5e',
    fontWeight: '600',
    fontFamily: 'Manrope',
  },
  milestoneBox: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  milestoneLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Manrope',
  },
  milestoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope',
  },
  milestoneDate: {
    fontSize: 11,
    color: '#595c5e',
    fontWeight: '500',
  },
});
