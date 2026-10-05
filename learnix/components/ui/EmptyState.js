import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * EmptyState — informative empty state with icon, title, subtitle, optional CTA.
 *
 * Usage:
 * <EmptyState
 *   icon="bus-outline"
 *   title="No routes yet"
 *   subtitle="Create your first route to get started."
 *   actionLabel="Create Route"
 *   onAction={handleCreate}
 * />
 */
export default function EmptyState({ icon = 'folder-open-outline', title, subtitle, actionLabel, onAction, color = '#94a3b8' }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1a' }]}>
        <Ionicons name={icon} size={40} color={color} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        // TouchableOpacity, not View: rendered as a plain View this looked like a
        // button and silently swallowed taps, so every caller passing
        // actionLabel/onAction got an empty state that could not be dismissed.
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={15} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
});
