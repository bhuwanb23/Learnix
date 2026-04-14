import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function JobSummaryCard() {
  return (
    <View style={styles.card}>
      {/* Decorative circle */}
      <View style={styles.decorativeCircle} />

      {/* Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Confirmed Receipt</Text>
      </View>

      {/* Role */}
      <View style={styles.roleSection}>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.roleTitle}>Senior Product Designer</Text>
      </View>

      {/* Company Info */}
      <View style={styles.companyInfo}>
        <View style={styles.companyLogo}>
          <MaterialIcons name="business" size={24} color="#595c5e" />
        </View>
        <View style={styles.companyDetails}>
          <Text style={styles.companyName}>Lumina Systems</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={14} color="#595c5e" />
            <Text style={styles.locationText}>Remote · Full-time</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Applied on Oct 24, 2023 · Reference: <Text style={styles.referenceCode}>#LS-77420</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#2c2f31',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
  },
  decorativeCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 80, 212, 0.05)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcc9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#5b00c7',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  roleSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#595c5e',
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#0050d4',
    lineHeight: 28,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef1f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(171, 173, 175, 0.15)',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 18,
  },
  referenceCode: {
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
});
