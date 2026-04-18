import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import theme
import { TYPOGRAPHY } from '../../../../../constants/theme';

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
    fontFamily: TYPOGRAPHY.fontFamily.headline,
    fontWeight: '700',
    color: '#2c2f31',
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.body,
    fontWeight: '400',
    color: '#595c5e',
    lineHeight: 21,
  },
});
