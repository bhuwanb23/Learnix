import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';

const CircularProgress = ({ percentage, color }) => {
  return (
    <View style={styles.progressWrapper}>
      {/* Outer colored ring */}
      <View
        style={[
          styles.outerRing,
          {
            borderColor: color,
          },
        ]}
      >
        {/* Inner white circle */}
        <View style={styles.innerCircle}>
          <Text style={[styles.percentageText, { color }]}>
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function CourseProgression({ courses }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Course Progression</Text>
      
      {courses.map((course, index) => (
        <View
          key={course.id}
          style={[
            styles.courseCard,
            index < courses.length - 1 && styles.cardSpacing,
          ]}
        >
          {/* Left: Progress Circle & Grade Badge */}
          <View style={styles.leftSection}>
            <CircularProgress percentage={course.progress} color={course.color} />
            <View style={[styles.gradeBadge, { backgroundColor: course.color }]}>
              <Text style={styles.gradeText}>{course.grade}</Text>
            </View>
          </View>

          {/* Middle: Course Information */}
          <View style={styles.middleSection}>
            <Text style={styles.courseName}>{course.name}</Text>
            <View style={styles.professorRow}>
              <Image
                source={{ uri: course.professorImage }}
                style={styles.professorAvatar}
              />
              <Text style={styles.professorName}>{course.professor}</Text>
            </View>
          </View>

          {/* Right: Next Milestone */}
          <View style={styles.milestoneContainer}>
            <Text style={[styles.milestoneLabel, { color: course.color }]}>
              Next Milestone
            </Text>
            <Text style={styles.milestoneTitle}>{course.milestone.title}</Text>
            <Text style={styles.milestoneDate}>{course.milestone.date}</Text>
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
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  leftSection: {
    alignItems: 'center',
    marginRight: 20,
  },
  progressWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  outerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.3,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Manrope-ExtraBold',
  },
  middleSection: {
    flex: 1,
    marginRight: 16,
  },
  courseName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  professorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  professorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  professorName: {
    fontSize: 13,
    color: '#595c5e',
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  milestoneContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    minWidth: 140,
    alignItems: 'flex-start',
  },
  milestoneLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    fontFamily: 'Manrope-ExtraBold',
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Manrope-Bold',
    marginBottom: 2,
  },
  milestoneDate: {
    fontSize: 11,
    color: '#595c5e',
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
});
