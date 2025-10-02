import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopicItem from './TopicItem';

export default function UnitCard({ 
  unit, 
  isExpanded, 
  onToggle, 
  onExplainTopic,
  delay = 0,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getStatusBadge = () => {
    switch (unit.status) {
      case 'complete':
        return (
          <View style={[styles.statusBadge, styles.completeBadge]}>
            <Text style={[styles.statusText, styles.completeText]}>Complete</Text>
          </View>
        );
      case 'in-progress':
        return (
          <View style={[styles.statusBadge, styles.progressBadge]}>
            <Text style={[styles.statusText, styles.progressText]}>
              {Math.round(unit.progress)}% Done
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
    ]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.unitName}>{unit.name}</Text>
        <View style={styles.headerRight}>
          {getStatusBadge()}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="chevron-down" size={14} color="#6b7280" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {isExpanded && unit.topics && (
        <View style={styles.topicsContainer}>
          {unit.topics.map((topic, index) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              onExplain={() => onExplainTopic(topic.name)}
              delay={index * 100}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  unitName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  completeBadge: {
    backgroundColor: '#dcfce7',
  },
  progressBadge: {
    backgroundColor: '#dbeafe',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.1,
  },
  completeText: {
    color: '#16a34a',
  },
  progressText: {
    color: '#2563eb',
  },
  topicsContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
});
