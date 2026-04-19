import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

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
    marginTop: 12,
    marginBottom: 46,
  },
  greeting: {
    fontSize: STUDENT_HOME_FONT.heroTitle,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: STUDENT_HOME_FONT.heroSubtitle,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 22,
  },
});
