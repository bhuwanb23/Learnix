import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UnitCard from './UnitCard';

export default function SubjectCard({ 
  subject, 
  isExpanded, 
  onToggle, 
  expandedUnits,
  onToggleUnit,
  onExplainTopic,
  delay = 0,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
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

  return (
    <Animated.View style={[
      styles.container,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <View style={styles.subjectInfo}>
            <View style={styles.iconContainer}>
              <Ionicons name={subject.icon} size={18} color="#2563eb" />
            </View>
            <View style={styles.subjectDetails}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Text style={styles.subjectMeta}>
                {subject.units} units • {subject.topics} topics
              </Text>
            </View>
          </View>
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>{subject.progress}%</Text>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <Ionicons name="chevron-down" size={16} color="#6b7280" />
            </Animated.View>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${subject.progress}%` }
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.unitsContainer}>
          {subject.units && subject.units.length > 0 ? (
            subject.units.map((unit, index) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                isExpanded={expandedUnits[unit.id]}
                onToggle={() => onToggleUnit(unit.id)}
                onExplainTopic={onExplainTopic}
                delay={index * 100}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>Click to expand units and topics</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  subjectMeta: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  unitsContainer: {
    paddingBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
    marginTop: 8,
  },
});
