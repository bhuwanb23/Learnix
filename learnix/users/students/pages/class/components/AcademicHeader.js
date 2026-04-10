import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function AcademicHeader({ semester, credits }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Academic Overview</Text>
          <Text style={styles.subtitle}>{semester} • {credits}</Text>
        </View>
        <TouchableOpacity style={styles.selectorContainer}>
          <Text style={styles.selectorText}>{semester}</Text>
          <MaterialIcons name="expand-more" size={24} color="#0050d4" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // container margin removed since parent has padding
  },
  headerContent: {
    flexDirection: 'column', // Stack vertically on small screens like HTML design
    gap: 16,
  },
  titleSection: {
    gap: 4,
  },
  title: {
    fontSize: 36, // text-4xl equivalent
    fontWeight: '800',
    color: '#2c2f31', // text-on-surface
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#595c5e', // text-on-surface-variant
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff', // bg-surface-container-lowest
    paddingVertical: 12,
    paddingLeft: 24,
    paddingRight: 16,
    borderRadius: 12, // rounded-xl
    alignSelf: 'flex-start',
    shadowColor: '#000', // shadow-sm
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  selectorText: {
    color: '#0050d4', // text-primary
    fontWeight: '700', // font-bold
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
});
