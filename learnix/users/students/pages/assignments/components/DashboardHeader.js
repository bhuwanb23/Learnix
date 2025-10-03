import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function DashboardHeader({ profile }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: profile.avatar }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.greeting}>Hi, {profile.name}</Text>
            <Text style={styles.subtitle}>{profile.greeting}</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsSection}>
          {/* Notifications */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons 
              name="notifications-outline" 
              size={20} 
              color={COLORS.textSecondary} 
            />
            {profile.notifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>
                  {profile.notifications}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Menu */}
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons 
              name="menu-outline" 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: SPACING.sm,
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
