import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AcademicHistory({ history }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Academic History</Text>
      <View style={styles.timeline}>
        {history.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={[styles.dot, { backgroundColor: item.active ? '#0050d4' : '#dfe3e6' }]} />
            {index < history.length - 1 && <View style={styles.line} />}
            <View style={styles.content}>
              <Text style={styles.degree}>{item.degree}</Text>
              <Text style={[styles.school, { color: item.active ? '#0050d4' : '#595c5e' }]}>{item.school}</Text>
              {item.description && <Text style={styles.description}>{item.description}</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.3,
    marginBottom: 24,
  },
  timeline: {
    paddingLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 16,
    position: 'relative',
    zIndex: 1,
  },
  line: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: -24,
    width: 2,
    backgroundColor: '#dfe3e6',
  },
  content: {
    flex: 1,
  },
  degree: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  school: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 18,
  },
});
