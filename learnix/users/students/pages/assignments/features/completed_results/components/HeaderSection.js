import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

export default function HeaderSection({ title, onBack }) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);
  const displayTitle = title?.trim() || 'Results';

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={COMPLETED_RESULTS_COLORS.primary} />
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
    backgroundColor: COMPLETED_RESULTS_COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COMPLETED_RESULTS_COLORS.surfaceContainer,
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
    color: COMPLETED_RESULTS_COLORS.onSurface,
    marginLeft: 4,
    flex: 1,
    lineHeight: 22,
  },
});
