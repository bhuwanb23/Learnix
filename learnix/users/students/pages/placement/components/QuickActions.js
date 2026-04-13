import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../constants/theme';

export default function QuickActions({ navigation }) {
  const handleBrowseJobs = () => {
    if (navigation) {
      navigation.navigate('BrowseJobs');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Browse Jobs */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={handleBrowseJobs}>
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Browse Jobs</Text>
          <Text style={styles.cardSubtitle}>150+ Matches</Text>
          <View style={styles.arrowIcon}>
            <Ionicons name="arrow-forward-outline" size={20} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* Placement Drives */}
        <TouchableOpacity style={[styles.card, styles.secondaryCard]} activeOpacity={0.8}>
          <View style={[styles.iconContainer, styles.secondaryIconContainer]}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.secondary} />
          </View>
          <Text style={styles.cardTitle}>Placement Drives</Text>
          <Text style={styles.cardSubtitle}>5 Upcoming</Text>
          <View style={styles.arrowIcon}>
            <Ionicons name="arrow-forward-outline" size={20} color={COLORS.secondary} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl + 8,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  secondaryCard: {
    // Secondary card styling
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  secondaryIconContainer: {
    backgroundColor: 'rgba(112, 42, 225, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
  },
  arrowIcon: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    opacity: 0,
  },
});
