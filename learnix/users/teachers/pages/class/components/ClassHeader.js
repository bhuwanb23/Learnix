import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClassHeader({ header }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>{header.title}</Text>
      <Text style={styles.subtitle}>{header.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 32,
    fontWeight: '800',
    color: '#2c2f31',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 24,
  },
});
