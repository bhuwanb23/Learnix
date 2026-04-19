import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

export default function UpcomingTestsTimeline({ tests }) {
  const hexToRgba = (hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${opacity})` 
      : null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Tests</Text>
        <TouchableOpacity>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timeline}>
        {/* Vertical line */}
        <View style={styles.timelineLine} />

        {tests.map((test, index) => (
          <View key={test.id} style={styles.timelineItem}>
            {/* Dot indicator with ring */}
            <View
              style={[
                styles.dotRing,
                { borderColor: hexToRgba(test.color, 0.2) }
              ]}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: test.color }
                ]}
              />
            </View>

            <View style={styles.testContent}>
              <Text style={[styles.daysLeft, { color: test.color }]}>
                {test.daysLeft}
              </Text>
              <Text style={styles.testTitle}>{test.title}</Text>
              <Text style={styles.testDate}>{test.date}</Text>
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
    borderRadius: 12, // rounded-xl
    padding: 24, // p-6
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24, // mb-6
  },
  title: {
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  viewAll: {
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
  },
  timeline: {
    position: 'relative',
    gap: 32, // space-y-8
  },
  timelineLine: {
    position: 'absolute',
    left: 16, // left-4
    top: 8, // top-2
    bottom: 8, // bottom-2
    width: 1, // w-px
    backgroundColor: 'rgba(171, 173, 175, 0.3)', // bg-outline-variant/30
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: 40, // pl-10
  },
  dotRing: {
    position: 'absolute',
    left: 12, // left-3
    top: 4, // top-1
    width: 10, // w-2.5
    height: 10, // h-2.5
    borderRadius: 5, // rounded-full
    borderWidth: 4, // ring-4
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  testContent: {
    flex: 1,
  },
  daysLeft: {
    fontSize: STUDENT_HOME_FONT.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: 'Manrope-Bold',
  },
  testTitle: {
    fontSize: STUDENT_HOME_FONT.cardTitle,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  testDate: {
    fontSize: STUDENT_HOME_FONT.cardMeta,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
});
