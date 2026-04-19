import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ModuleCard({ module }) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: module.iconBg }]}>
          <MaterialIcons name={module.icon} size={24} color={module.iconColor} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{module.activeCount} Active</Text>
        </View>
      </View>

      {/* Title & Description */}
      <Text style={[styles.title, { color: module.iconColor }]}>{module.title}</Text>
      <Text style={styles.description}>{module.description}</Text>

      {/* Next Deadline */}
      <View style={styles.deadline}>
        <View style={styles.deadlineInfo}>
          <Text style={styles.deadlineLabel}>Next Deadline</Text>
          <Text style={styles.deadlineTitle}>{module.nextDeadline}</Text>
        </View>
        <Text style={styles.deadlineDate}>{module.deadlineDate}</Text>
      </View>

      {/* Engagement Progress */}
      <View style={styles.engagement}>
        <View style={styles.engagementHeader}>
          <Text style={styles.engagementLabel}>Engagement</Text>
          <Text style={[styles.engagementValue, { color: module.engagementColor }]}>
            {module.engagement}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${module.engagement}%`,
                backgroundColor: module.engagementColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    padding: 12,
    borderRadius: 8,
  },
  badge: {
    backgroundColor: '#dfe3e6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#2c2f31',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: '#595c5e',
    marginBottom: 20,
  },
  deadline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eef1f3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  deadlineTitle: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: '#2c2f31',
  },
  deadlineDate: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#a23800',
  },
  engagement: {
    paddingTop: 8,
  },
  engagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  engagementLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#2c2f31',
  },
  engagementValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#dfe3e6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
