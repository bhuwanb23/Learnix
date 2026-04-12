import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EVENT_DETAILS_COLORS } from '../constants/eventDetailsData';

export default function BottomActionBar({ registrationEnds, onRegister }) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Registration ends in</Text>
          <Text style={styles.timeValue}>{registrationEnds}</Text>
        </View>
        <TouchableOpacity style={styles.registerButton} onPress={onRegister} activeOpacity={0.8}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  bar: {
    backgroundColor: 'rgba(233, 233, 233, 1)',
    borderRadius: 999,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInfo: {
    paddingLeft: 10,
  },
  timeLabel: {
    fontFamily: 'Manrope-Bold',
    fontSize: 7,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '800',
    color: EVENT_DETAILS_COLORS.tertiary,
    marginTop: 2,
  },
  registerButton: {
    backgroundColor: EVENT_DETAILS_COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
  },
  registerButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onPrimary,
  },
});
