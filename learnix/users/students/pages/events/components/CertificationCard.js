import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function CertificationCard({ certification, onPress, onEnroll }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(certification)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.certificationInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="certificate" size={20} color="#FCD34D" />
              </View>
              <Text style={styles.certificationType}>Micro-Certification</Text>
            </View>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>4 weeks</Text>
            </View>
          </View>

          <Text style={styles.title}>{certification.title}</Text>
          <Text style={styles.description}>{certification.description}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={14} color="#FCD34D" />
              <Text style={styles.statText}>4.8 (156)</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color="#FFFFFF" />
              <Text style={styles.statText}>2,341 enrolled</Text>
            </View>
          </View>

          <View style={styles.tagsContainer}>
            {certification.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.enrollButton}
            onPress={() => onEnroll(certification)}
          >
            <Text style={styles.enrollButtonText}>
              Enroll Now - {certification.price}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradient: {
    borderRadius: BORDER_RADIUS.xl,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  certificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: SPACING.sm,
  },
  certificationType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#FFFFFF',
  },
  durationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  durationText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#FFFFFF',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#FFFFFF',
  },
  enrollButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
  },
  enrollButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#8B5CF6',
  },
});
