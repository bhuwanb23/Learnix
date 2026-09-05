import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function EmptyState({ icon = 'file-tray-outline', title, message }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={32} color="#94a3b8" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#475569',
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'center',
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});