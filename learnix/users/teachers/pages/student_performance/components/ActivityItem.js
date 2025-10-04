import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function ActivityItem({ activity }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: activity.avatar }} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.studentName}>{activity.studentName}</Text>
        <Text style={styles.action}>{activity.action}</Text>
      </View>
      <Text style={styles.timeAgo}>{activity.timeAgo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm
  },
  content: {
    flex: 1
  },
  studentName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary
  },
  action: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  timeAgo: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary
  }
});
