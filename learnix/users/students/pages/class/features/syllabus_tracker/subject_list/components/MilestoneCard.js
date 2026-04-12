import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SYLLABUS_TRACKER_COLORS } from '../constants/syllabusData';

export default function MilestoneCard({ data, onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.gradientBg}>
        <View style={styles.content}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.description}>{data.description}</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>{data.buttonText}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.decoration1} />
        <View style={styles.decoration2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 24,
  },
  gradientBg: {
    backgroundColor: SYLLABUS_TRACKER_COLORS.primary,
    padding: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 19,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: SYLLABUS_TRACKER_COLORS.primary,
  },
  decoration1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${SYLLABUS_TRACKER_COLORS.primaryContainer}33`,
  },
  decoration2: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${SYLLABUS_TRACKER_COLORS.secondary}1A`,
  },
});
