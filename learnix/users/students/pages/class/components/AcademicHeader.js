import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function AcademicHeader({ semester, credits }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Academic Overview</Text>
          <Text style={styles.subtitle}>{semester} • {credits}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2c2f31',
    fontFamily: 'Plus Jakarta Sans',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#595c5e',
    fontWeight: '500',
    fontFamily: 'Manrope',
  },
});
