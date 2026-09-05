import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SPACING } from '../../../../constants/theme';

export default function EmptyState({ icon = 'file-tray-outline', title, message }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={30} color="#94a3b8" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#eef1f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
});