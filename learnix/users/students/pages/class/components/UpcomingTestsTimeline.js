import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function UpcomingTestsTimeline({ tests }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Tests</Text>
        <Text style={styles.viewAll}>View All</Text>
      </View>

      <View style={styles.timeline}>
        {/* Vertical line */}
        <View style={styles.timelineLine} />

        {tests.map((test, index) => (
          <View key={test.id} style={styles.timelineItem}>
            {/* Dot indicator */}
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: test.color,
                  shadowColor: test.color,
                },
              ]}
            />

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
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'Plus Jakarta Sans',
  },
  viewAll: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope',
  },
  timeline: {
    position: 'relative',
    paddingLeft: 24,
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 4,
    bottom: 4,
    width: 1,
    backgroundColor: 'rgba(171, 173, 175, 0.3)',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 32,
  },
  dot: {
    position: 'absolute',
    left: -19,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  testContent: {
    flex: 1,
  },
  daysLeft: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: 'Manrope',
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 2,
    fontFamily: 'Manrope',
  },
  testDate: {
    fontSize: 12,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope',
  },
});
