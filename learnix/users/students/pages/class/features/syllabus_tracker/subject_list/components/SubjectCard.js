import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SYLLABUS_TRACKER_COLORS } from '../constants/syllabusData';

export default function SubjectCard({ subject, onPress }) {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(subject)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{subject.name}</Text>
          <Text style={styles.subtitle}>{subject.category} • {subject.semester}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: subject.typeBg }]}>
          <Text style={[styles.typeText, { color: subject.typeColor }]}>{subject.type}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Completion</Text>
          <Text style={styles.progressValue}>{subject.completion}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${subject.completion}%`,
                backgroundColor: subject.progressColor 
              }
            ]} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SYLLABUS_TRACKER_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: SYLLABUS_TRACKER_COLORS.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: SYLLABUS_TRACKER_COLORS.onSurfaceVariant,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
  },
  progressSection: {
    gap: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: SYLLABUS_TRACKER_COLORS.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: SYLLABUS_TRACKER_COLORS.onSurface,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: SYLLABUS_TRACKER_COLORS.surfaceContainerHigh,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
});
