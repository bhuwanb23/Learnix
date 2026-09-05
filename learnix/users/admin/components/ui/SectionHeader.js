import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SPACING } from '../../../../constants/theme';

export default function SectionHeader({ title, actionLabel, onAction, actionIcon, subtitle }) {
  return (
    <View style={styles.container}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.7}>
          {actionIcon ? <Ionicons name={actionIcon} size={14} color="#0050d4" /> : null}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  titleWrap: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#595c5e',
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0050d4',
    fontFamily: 'Manrope-Bold',
  },
});