import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';

export default function ProfileStrength() {
  const progress = 85;

  return (
    <View style={styles.bentoGrid}>
      {/* Profile Strength Card */}
      <View style={styles.profileCard}>
        <View style={styles.progressCircle}>
          <View style={styles.progressRing} />
          <View style={styles.progressInner}>
            <Text style={styles.progressText}>{progress}%</Text>
            <Text style={styles.progressLabel}>Strength</Text>
          </View>
        </View>
        
        <View style={styles.profileInfo}>
          <View>
            <Text style={styles.profileTitle}>Profile Strength</Text>
            <Text style={styles.profileSubtitle}>
              Add 'Certifications' to reach 95% and unlock Premium roles.
            </Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Resume Score</Text>
              <Text style={[styles.statValue, { color: '#702ae1' }]}>92/100</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Eligibility</Text>
              <Text style={[styles.statValue, { color: '#a23800' }]}>Verified</Text>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Card */}
      <TouchableOpacity style={styles.ctaCard} activeOpacity={0.9}>
        <MaterialIcons name="rocket-launch" size={32} color="#ffffff" style={{ marginBottom: 16 }} />
        <Text style={styles.ctaTitle}>Ready for Direct Interview?</Text>
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>Update Availability</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bentoGrid: {
    marginBottom: 48,
    gap: 24,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 24,
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  progressCircle: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: '#0050d4',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  progressInner: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  progressText: {
    fontSize: STUDENT_HOME_FONT.bigStat,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#0050d4',
  },
  progressLabel: {
    fontSize: STUDENT_HOME_FONT.caption,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  profileInfo: {
    width: '100%',
    gap: 24,
  },
  profileTitle: {
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileSubtitle: {
    fontSize: STUDENT_HOME_FONT.heroSubtitle,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 22,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#eef1f3',
    padding: 16,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: STUDENT_HOME_FONT.caption,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: STUDENT_HOME_FONT.statValue,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
  },
  ctaCard: {
    backgroundColor: '#0050d4',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: STUDENT_HOME_FONT.cardTitle,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
});
