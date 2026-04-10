import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { TOPIC_DIRECTORY_COLORS } from '../constants/topicDirectoryData';

export default function MasteryInsight({ data }) {
  const circumference = 2 * Math.PI * 40;
  const strokeOffset = circumference - (data.masteryPercent / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.textSection}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.recommendation}>
          Based on your performance in <Text style={styles.highlight}>{data.weakTopic}</Text>, we recommend revisiting the fundamental identities before attempting the <Text style={styles.warning}>{data.hardTopic}</Text> quiz.
        </Text>
      </View>

      <View style={styles.chartSection}>
        <View style={styles.circleContainer}>
          <View style={styles.circle}>
            <View style={[styles.circleFill, { 
              width: data.masteryPercent * 0.8,
            }]} />
          </View>
          <Text style={styles.percentText}>{data.masteryPercent}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${TOPIC_DIRECTORY_COLORS.primary}0D`,
    borderRadius: 14,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: `${TOPIC_DIRECTORY_COLORS.primary}1A`,
    marginTop: 20,
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
    marginBottom: 10,
  },
  recommendation: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: TOPIC_DIRECTORY_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_DIRECTORY_COLORS.primary,
  },
  warning: {
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_DIRECTORY_COLORS.error,
  },
  chartSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TOPIC_DIRECTORY_COLORS.surfaceContainerHigh,
  },
  circleFill: {
    position: 'absolute',
    height: 80,
    backgroundColor: TOPIC_DIRECTORY_COLORS.primary,
    borderRadius: 40,
    left: 0,
    top: 0,
  },
  percentText: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
    position: 'relative',
    zIndex: 1,
  },
});
