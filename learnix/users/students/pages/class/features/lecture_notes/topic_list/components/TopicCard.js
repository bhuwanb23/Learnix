import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_COLORS } from '../constants/topicListData';

export default function TopicCard({ topic, onPress }) {
  const isCompleted = topic.status === 'completed';

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.progressCircle}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={TOPIC_COLORS.primary} />
          ) : (
            <Text style={styles.progressText}>{topic.progress}%</Text>
          )}
        </View>

        <View style={[styles.difficultyBadge, { backgroundColor: topic.difficultyColor }]}>
          <Text style={[styles.difficultyText, { color: topic.difficultyTextColor }]}>
            {topic.difficulty}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{topic.title}</Text>
      <Text style={styles.description} numberOfLines={2}>{topic.description}</Text>

      <TouchableOpacity style={styles.openButton} activeOpacity={0.7}>
        <Ionicons name="document-text-outline" size={18} color={TOPIC_COLORS.onSurface} />
        <Text style={styles.openButtonText}>Open Notes</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOPIC_COLORS.surfaceContainerLowest,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 80, 212, 0.05)',
    borderWidth: 2,
    borderColor: TOPIC_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_COLORS.onSurfaceVariant,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_COLORS.onSurface,
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: TOPIC_COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TOPIC_COLORS.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: 8,
  },
  openButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_COLORS.onSurface,
  },
});
