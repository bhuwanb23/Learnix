import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function HeaderSection({ assignment, onBack }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);
  const title = assignment?.title?.trim() || 'Assignment details';

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={ACTIVE_ASSIGNMENT_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerHigh,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 44,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurface,
    marginLeft: 4,
    flex: 1,
    lineHeight: 22,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACTIVE_ASSIGNMENT_COLORS.tertiary,
  },
  priorityText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 11,
    fontWeight: '600',
    color: ACTIVE_ASSIGNMENT_COLORS.onSurfaceVariant,
  },
});
