import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StatCard({ icon, value, label, subtitle, color = '#2563eb', onPress, compact }) {
  const content = (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={compact ? 16 : 20} color={color} />
      </View>
      <Text style={[styles.value, compact && styles.compactValue]}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity style={styles.wrapper} onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  compactCard: {
    padding: 14,
    borderRadius: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  compactValue: {
    fontSize: 18,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
});