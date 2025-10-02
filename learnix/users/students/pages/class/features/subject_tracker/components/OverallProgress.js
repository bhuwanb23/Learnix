import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';

export default function OverallProgress({ progressData }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progressData.percentage,
        duration: 1200,
        delay: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, [progressData.percentage]);

  return (
    <Animated.View style={[
      styles.container,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <View style={styles.header}>
        <Text style={styles.title}>Overall Progress</Text>
        <Text style={styles.percentage}>{progressData.percentage}%</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
      </View>
      
      <Text style={styles.subtitle}>
        {progressData.completedTopics} of {progressData.totalTopics} topics completed
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },
  percentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
});
