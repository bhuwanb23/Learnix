import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

const CircularProgress = ({ percentage, color }) => {
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.progressWrapper}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          stroke="#ffffff"
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <Circle
          stroke={color}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.innerCircle, StyleSheet.absoluteFill]}>
        <Text style={styles.percentageText}>{percentage}%</Text>
      </View>
    </View>
  );
};

export default function CourseProgression({ courses }) {
  const hexToRgba = (hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` 
      : null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Course Progression</Text>
      
      <View style={styles.listContainer}>
        {courses.map((course, index) => (
          <View
            key={course.id}
            style={[
              styles.courseCard,
              { 
                backgroundColor: hexToRgba(course.color, 0.05),
                borderColor: hexToRgba(course.color, 0.1),
              }
            ]}
          >
            <View style={styles.topSection}>
              {/* Left: Progress Circle & Grade Badge */}
              <View style={styles.leftSection}>
                <CircularProgress percentage={course.progress} color={course.color} />
                <View style={[styles.gradeBadge, { backgroundColor: course.color }]}>
                  <Text style={styles.gradeText}>GRADE: {course.grade}</Text>
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
            </View>

            {/* Right/Bottom: Next Milestone */}
            <View style={[
              styles.milestoneContainer,
              { borderColor: hexToRgba(course.color, 0.05) }
            ]}>
              <Text style={[styles.milestoneLabel, { color: course.color }]}>
                Next Milestone
              </Text>
              <Text style={styles.milestoneTitle}>
                {course.milestone.title}
                <Text style={styles.milestoneDate}> • {course.milestone.date}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Removed margin since parent has padding
  },
  sectionTitle: {
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 24,
  },
  listContainer: {
    gap: 16, // space-y-4
  },
  courseCard: {
    flexDirection: 'column', // Stack for mobile
    borderRadius: 24, // rounded-2xl
    padding: 24, // p-6
    borderWidth: 1,
    gap: 24, // gap-6
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24, // gap-6
  },
  leftSection: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  progressWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  innerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: STUDENT_HOME_FONT.captionWide,
    fontWeight: '800',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  gradeBadge: {
    paddingHorizontal: 12, // px-3
    paddingVertical: 4, // py-1
    borderRadius: 999, // rounded-full
  },
  gradeText: {
    fontSize: STUDENT_HOME_FONT.caption,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Manrope-Bold',
  },
  middleSection: {
    flex: 1,
  },
  courseName: {
    fontSize: STUDENT_HOME_FONT.cardTitle,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4,
  },
  professorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  professorAvatar: {
    width: 24, // w-6
    height: 24, // h-6
    borderRadius: 12, // rounded-full
    opacity: 0.8,
  },
  professorName: {
    fontSize: STUDENT_HOME_FONT.bodySecondary,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
  milestoneContainer: {
    width: '100%', // w-full
    paddingHorizontal: 24, // px-6
    paddingVertical: 16, // py-4
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // bg-white/60
    borderRadius: 12, // rounded-xl
    borderWidth: 1,
  },
  milestoneLabel: {
    fontSize: STUDENT_HOME_FONT.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Manrope-Bold',
  },
  milestoneTitle: {
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  milestoneDate: {
    fontSize: STUDENT_HOME_FONT.cardMeta,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
});
