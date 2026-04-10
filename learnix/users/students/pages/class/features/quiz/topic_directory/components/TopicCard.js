import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOPIC_DIRECTORY_COLORS } from '../constants/topicDirectoryData';

export default function TopicCard({ topic, onPress, onButtonPress }) {
  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress(topic);
    } else if (onPress) {
      onPress(topic);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(topic)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: topic.bgColor }]}>
          <Ionicons name={topic.icon} size={24} color={topic.iconColor} />
        </View>
        <View style={[styles.difficultyBadge, { backgroundColor: topic.difficultyBg }]}>
          <Text style={[styles.difficultyText, { color: topic.difficultyColor }]}>{topic.difficulty}</Text>
        </View>
      </View>

      <Text style={styles.title}>{topic.title}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>High Score</Text>
          <Text style={styles.statValue}>{topic.highScore}%</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Last Attempt</Text>
          <Text style={styles.statValue}>{topic.lastAttempt}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.button, topic.isReview && styles.reviewButton]}
        onPress={handleButtonPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, topic.isReview && styles.reviewButtonText]}>
          {topic.isReview ? 'Review Again' : 'Start Quiz'}
        </Text>
        <Ionicons 
          name={topic.isReview ? 'refresh' : 'arrow-forward'} 
          size={16} 
          color={topic.isReview ? TOPIC_DIRECTORY_COLORS.onSurface : '#ffffff'} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOPIC_DIRECTORY_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${TOPIC_DIRECTORY_COLORS.outlineVariant}1A`,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_DIRECTORY_COLORS.onSurface,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: `${TOPIC_DIRECTORY_COLORS.outlineVariant}4D`,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TOPIC_DIRECTORY_COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reviewButton: {
    backgroundColor: TOPIC_DIRECTORY_COLORS.surfaceContainerHigh,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  reviewButtonText: {
    color: TOPIC_DIRECTORY_COLORS.onSurface,
  },
});
