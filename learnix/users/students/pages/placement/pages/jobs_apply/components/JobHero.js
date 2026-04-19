import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function JobHero({ compact = false }) {
  return (
    <View style={styles.container}>
      <View style={styles.activeBadge}>
        <View style={styles.activeDot} />
        <Text style={styles.activeBadgeText}>Active Posting</Text>
      </View>
      <Text style={[styles.jobTitle, compact && styles.jobTitleCompact]}>
        Senior Product Designer
      </Text>
      <Text
        style={styles.companyName}
        numberOfLines={compact ? 3 : 2}
      >
        Lumina Global Systems • Remote, Global
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 16,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0050d4',
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#0050d4',
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    letterSpacing: -1,
    color: '#2c2f31',
    marginBottom: 8,
    lineHeight: 38,
  },
  jobTitleCompact: {
    fontSize: 24,
    lineHeight: 30,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
  },
});
