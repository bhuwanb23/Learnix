import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function WeakTopics({ topics, onTopicPress }) {
  if (!topics || topics.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="warning-outline" size={20} color="#DC2626" />
          <Text style={styles.title}>Weak Topics</Text>
        </View>
        
        <View style={styles.topicsList}>
          {topics.map((topic) => (
            <View key={topic.id} style={styles.topicItem}>
              <Text style={styles.topicName}>{topic.name}</Text>
              <TouchableOpacity
                style={styles.practiceButton}
                onPress={() => onTopicPress(topic.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.practiceButtonText}>Practice</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  card: {
    backgroundColor: '#FEF2F2',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#991B1B',
  },
  topicsList: {
    gap: SPACING.xs,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#B91C1C',
    flex: 1,
  },
  practiceButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  practiceButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#DC2626',
  },
});
