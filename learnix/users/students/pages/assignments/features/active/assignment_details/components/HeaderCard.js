import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function HeaderCard({ assignment }) {
  return (
    <View style={styles.container}>
      <View style={styles.codeRow}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{assignment.code}</Text>
        </View>
        <View style={styles.timeInfo}>
          <MaterialIcons name="schedule" size={14} color={ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant} />
          <Text style={styles.timeText}>{assignment.estimatedTime}</Text>
        </View>
      </View>

      <Text style={styles.title}>{assignment.title}</Text>
      <Text style={styles.description}>{assignment.description}</Text>

      <View style={styles.divider} />

      <View style={styles.metadataRow}>
        <View style={styles.metadataItem}>
          <MaterialIcons name="cloud-done" size={20} color={ACTIVE_ASSIGNMENT_COLORS.primary} />
          <View style={styles.metadataText}>
            <Text style={styles.metadataLabel}>Status</Text>
            <Text style={styles.metadataValue}>{assignment.status}</Text>
          </View>
        </View>
        <View style={styles.metadataItem}>
          <MaterialIcons name="description" size={20} color={ACTIVE_ASSIGNMENT_COLORS.primary} />
          <View style={styles.metadataText}>
            <Text style={styles.metadataLabel}>Format</Text>
            <Text style={styles.metadataValue}>{assignment.format}</Text>
          </View>
        </View>
        <View style={styles.metadataItem}>
          <MaterialIcons name="star" size={20} color={ACTIVE_ASSIGNMENT_COLORS.primary} />
          <View style={styles.metadataText}>
            <Text style={styles.metadataLabel}>Weight</Text>
            <Text style={styles.metadataValue}>{assignment.weight}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLowest,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 24,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  codeBadge: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSecondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '800',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
    lineHeight: 30,
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainer,
    marginBottom: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  metadataText: {
    gap: 2,
  },
  metadataLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
  },
});
