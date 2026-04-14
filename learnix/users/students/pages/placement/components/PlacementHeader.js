import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY } from '../../../../../constants/theme';

export default function PlacementHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, Alex</Text>
      <Text style={styles.subtitle}>
        Your placement journey is 85% complete. You're in the top 5% of your cohort.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 22,
  },
});
