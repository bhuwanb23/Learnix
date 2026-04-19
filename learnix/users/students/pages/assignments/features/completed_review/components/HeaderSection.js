import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function HeaderSection({ title, onBack }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);
  const displayTitle = title?.trim() || 'Under review';

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color="#0050d4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2} ellipsizeMode="tail">
          {displayTitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COMPLETED_REVIEW_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COMPLETED_REVIEW_COLORS.surfaceContainer,
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
    color: COMPLETED_REVIEW_COLORS.onSurface,
    marginLeft: 4,
    flex: 1,
    lineHeight: 22,
  },
});
