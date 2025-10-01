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

export default function GroupCard({ group, onPress, onJoin }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(group)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.groupInfo}>
          <LinearGradient
            colors={group.gradient}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={group.icon} size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.textContainer}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.memberCount}>
              {group.members.toLocaleString()} members • {group.isActive ? 'Very active' : 'Active'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: group.color }]}
          onPress={() => onJoin(group)}
        >
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{group.description}</Text>

      <View style={styles.footer}>
        <View style={styles.memberAvatars}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.moreAvatars}>
            <Text style={styles.moreText}>+5</Text>
          </View>
        </View>
        <Text style={styles.onlineText}>• {group.onlineMembers} online now</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  memberCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  joinButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  joinButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#FFFFFF',
  },
  description: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreAvatars: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  onlineText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#10B981',
  },
});
