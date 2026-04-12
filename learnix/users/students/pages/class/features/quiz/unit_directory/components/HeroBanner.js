import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_DIRECTORY_COLORS } from '../constants/unitDirectoryData';

export default function HeroBanner({ subject, onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.gradientBg}>
        <View style={styles.content}>
          <View style={styles.textSection}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Challenge Mode</Text>
            </View>
            <Text style={styles.title}>{subject.title}</Text>
            <Text style={styles.description}>{subject.description}</Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <Ionicons name="rocket-sharp" size={18} color={UNIT_DIRECTORY_COLORS.primary} />
              <Text style={styles.buttonText}>Full Subject Test</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.masteryCard}>
            <Text style={styles.masteryLabel}>CURRENT MASTERY</Text>
            <Text style={styles.masteryValue}>{subject.mastery}%</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${subject.mastery}%` }]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientBg: {
    backgroundColor: UNIT_DIRECTORY_COLORS.primary,
    padding: 18,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  textSection: {
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerLowest,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.primary,
  },
  masteryCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  masteryLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  masteryValue: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
});
