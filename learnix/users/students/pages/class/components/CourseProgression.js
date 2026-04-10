import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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
    fontSize: 20, // text-xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 24, // mb-6
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
    fontSize: 12, // text-xs
    fontWeight: '900', // font-black
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  gradeBadge: {
    paddingHorizontal: 12, // px-3
    paddingVertical: 4, // py-1
    borderRadius: 999, // rounded-full
  },
  gradeText: {
    fontSize: 10, // text-[10px]
    fontWeight: '700', // font-bold
    color: '#ffffff', // text-white
    textTransform: 'uppercase',
    letterSpacing: 0.5, // tracking-wider
    fontFamily: 'Manrope-Bold',
  },
  middleSection: {
    flex: 1,
  },
  courseName: {
    fontSize: 20, // text-xl
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
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
    fontSize: 14, // text-sm
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '600', // font-semibold
    fontFamily: 'Manrope-SemiBold',
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
    fontSize: 10, // text-[10px]
    fontWeight: '700', // font-bold
    textTransform: 'uppercase',
    marginBottom: 4, // mb-1
    fontFamily: 'Manrope-Bold',
  },
  milestoneTitle: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'Manrope-Bold',
  },
  milestoneDate: {
    fontSize: 12, // text-xs
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
});
