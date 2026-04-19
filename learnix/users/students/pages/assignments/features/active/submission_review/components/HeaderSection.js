import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUBMISSION_REVIEW_COLORS } from '../constants/submissionReviewData';

export default function HeaderSection({ data, onBack }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);
  const title = data?.title?.trim() || 'Review submission';

  return (
    <View style={[styles.wrap, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
            <MaterialIcons name="arrow-back" size={24} color={SUBMISSION_REVIEW_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </Text>
        </View>
        <Text style={styles.timerText} numberOfLines={1}>
          {data.timeRemaining}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: SUBMISSION_REVIEW_COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SUBMISSION_REVIEW_COLORS.surfaceContainer,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    color: SUBMISSION_REVIEW_COLORS.onSurface,
    marginLeft: 8,
    flex: 1,
    lineHeight: 22,
  },
  timerText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.primary,
    flexShrink: 0,
  },
});
