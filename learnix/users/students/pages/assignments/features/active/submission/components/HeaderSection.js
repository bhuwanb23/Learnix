import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBMISSION_COLORS } from '../constants/submissionData';

export default function HeaderSection({ assignment, onBack }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);
  const title = assignment?.title?.trim() || 'Submit assignment';

  return (
    <View style={[styles.wrap, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={SUBMISSION_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </Text>
        </View>
        <View style={styles.timerBadge}>
          <MaterialIcons name="schedule" size={16} color={SUBMISSION_COLORS.tertiary} />
          <Text style={styles.timerText}>00:45:00</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: SUBMISSION_COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUBMISSION_COLORS.surfaceContainer,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: SUBMISSION_COLORS.primary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  timerText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: SUBMISSION_COLORS.primary,
  },
});
