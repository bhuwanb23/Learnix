import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

const metadata = [
  { label: 'Job ID', value: '#LGS-2024-089' },
  { label: 'Location', value: 'Hybrid (New York)' },
  { label: 'Openings', value: '3 Positions' },
];

export default function JobMetadata() {
  return (
    <View style={styles.container}>
      {metadata.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.row,
            index < metadata.length - 1 && styles.borderBottom,
          ]}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
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
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.1)',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
  },
  value: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
});
