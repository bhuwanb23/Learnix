import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UNIT_COLORS } from '../constants/unitListData';

export default function SubjectHeroBanner({ subject }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[UNIT_COLORS.primary, UNIT_COLORS.primaryDim]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative background shape */}
      <View style={styles.decorativeShape} />

      <View style={styles.content}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{subject.code}</Text>
        </View>

        <Text style={styles.title}>{subject.title}</Text>
        
        <Text style={styles.description}>{subject.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{subject.progress}%</Text>
            <Text style={styles.statLabel}>Overall Progress</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{subject.lecturesLeft}</Text>
            <Text style={styles.statLabel}>Lectures Left</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 180,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeShape: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    padding: 24,
    position: 'relative',
    zIndex: 1,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    marginBottom: 10,
    lineHeight: 32,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 280,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statItem: {
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
