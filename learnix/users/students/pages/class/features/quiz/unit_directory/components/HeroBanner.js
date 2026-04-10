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
              <Ionicons name="rocket-sharp" size={20} color={UNIT_DIRECTORY_COLORS.primary} />
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
    marginBottom: 20,
  },
  gradientBg: {
    backgroundColor: UNIT_DIRECTORY_COLORS.primary,
    padding: 24,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  textSection: {
    maxWidth: 320,
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
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
    lineHeight: 32,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerLowest,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.primary,
  },
  masteryCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  masteryLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  masteryValue: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
});
