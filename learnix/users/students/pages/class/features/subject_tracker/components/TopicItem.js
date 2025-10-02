import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TopicItem({ topic, onExplain, delay = 0 }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getStatusIcon = () => {
    if (topic.completed) {
      return <Ionicons name="checkmark-circle" size={16} color="#22c55e" />;
    }
    return <Ionicons name="ellipse-outline" size={16} color="#9ca3af" />;
  };

  return (
    <Animated.View style={[
      styles.container,
      { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
    ]}>
      <View style={styles.topicContent}>
        <View style={styles.topicInfo}>
          {getStatusIcon()}
          <Text style={[
            styles.topicName,
            topic.completed ? styles.completedTopic : styles.pendingTopic
          ]}>
            {topic.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.explainButton}
          onPress={onExplain}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={12} color="#2563eb" />
          <Text style={styles.explainText}>Explain</Text>
        </TouchableOpacity>
      </View>

      {topic.missedClass && topic.resources && (
        <View style={styles.missedClassAlert}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning-outline" size={14} color="#f59e0b" />
            <Text style={styles.alertText}>Missed class on {topic.name}</Text>
          </View>
          <View style={styles.resourcesList}>
            {topic.resources.map((resource, index) => (
              <TouchableOpacity key={index} style={styles.resourceItem}>
                <Text style={styles.resourceText}>
                  {resource.type === 'study-guide' ? '📚' : '🎥'} {resource.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  topicContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  topicName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
    flex: 1,
  },
  completedTopic: {
    color: '#374151',
  },
  pendingTopic: {
    color: '#6b7280',
  },
  explainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  explainText: {
    fontSize: 10,
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.1,
  },
  missedClassAlert: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    marginTop: 8,
    borderRadius: 6,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 12,
    color: '#92400e',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  resourcesList: {
    gap: 4,
  },
  resourceItem: {
    paddingVertical: 2,
  },
  resourceText: {
    fontSize: 10,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
});
