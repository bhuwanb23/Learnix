import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';
import { PLACEMENT_COMPACT_MAX } from '../../../placementLayout';

const metadata = [
  { label: 'Job ID', value: '#LGS-2024-089' },
  { label: 'Location', value: 'Hybrid (New York)' },
  { label: 'Openings', value: '3 Positions' },
];

export default function JobMetadata() {
  const { width } = useWindowDimensions();
  const stack = width < PLACEMENT_COMPACT_MAX;

  return (
    <View style={styles.container}>
      {metadata.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.row,
            stack && styles.rowStacked,
            index < metadata.length - 1 && styles.borderBottom,
          ]}
        >
          <Text style={[styles.label, stack && styles.labelStacked]}>{item.label}</Text>
          <Text style={[styles.value, stack && styles.valueStacked]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  rowStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.1)',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
    flexShrink: 0,
  },
  labelStacked: {
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  valueStacked: {
    textAlign: 'left',
    alignSelf: 'stretch',
    marginLeft: 0,
    flex: 0,
  },
});
