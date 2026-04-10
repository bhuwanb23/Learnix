import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEAK_TOPICS_COLORS } from '../constants/weakTopicsData';

export default function ActivityTimeline({ items, studyTip }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Activity Timeline</Text>
      
      <View style={styles.timeline}>
        {items.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={[styles.dot, item.isActive && styles.activeDot]} />
            {index < items.length - 1 && <View style={styles.line} />}
            <View style={styles.itemContent}>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="lightbulb" size={24} color="#ffffff" style={styles.tipIcon} />
        <Text style={styles.tipTitle}>{studyTip.title}</Text>
        <Text style={styles.tipContent}>{studyTip.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  timeline: {
    padding: 16,
    gap: 18,
  },
  timelineItem: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    left: -26,
    top: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerHigh,
    borderWidth: 4,
    borderColor: WEAK_TOPICS_COLORS.surface,
  },
  activeDot: {
    backgroundColor: WEAK_TOPICS_COLORS.primary,
    shadowColor: WEAK_TOPICS_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  line: {
    position: 'absolute',
    left: -19,
    top: 22,
    bottom: -16,
    width: 2,
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerHigh,
  },
  itemContent: {
    gap: 4,
  },
  time: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
  },
  itemDescription: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    lineHeight: 16,
  },
  tipCard: {
    backgroundColor: WEAK_TOPICS_COLORS.primary,
    padding: 14,
    borderRadius: 10,
    shadowColor: WEAK_TOPICS_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  tipIcon: {
    marginBottom: 6,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  tipContent: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
});
