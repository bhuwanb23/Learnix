import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';

export default function UpcomingTestsTimeline({ tests }) {
  const handleViewAll = () => {
    Alert.alert('All Tests', 'Your complete exam and test schedule will open here.');
  };

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
        <TouchableOpacity onPress={handleViewAll} activeOpacity={0.7}>
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
    fontSize: 16, // Assuming base size
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
  },
  viewAll: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    color: '#0050d4', // text-primary
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
    fontSize: 10, // text-[10px]
    fontWeight: '800', // font-extrabold
    textTransform: 'uppercase',
    letterSpacing: -0.5, // tracking-tighter
    marginBottom: 4, // mb-1
    fontFamily: 'Manrope-ExtraBold',
  },
  testTitle: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    fontFamily: 'Manrope-Bold',
  },
  testDate: {
    fontSize: 12, // text-xs
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500', // font-medium
    fontFamily: 'Manrope-Medium',
  },
});
