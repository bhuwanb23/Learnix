import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function QuickStats({ stats, onStatPress }) {
  const getIconName = (iconType) => {
    const iconMap = {
      'calendar-check': 'calendar-check-outline',
      'chart-line': 'trending-up-outline',
      'triangle-exclamation': 'warning-outline',
      'clock': 'time-outline',
    };
    return iconMap[iconType] || 'help-outline';
  };

  const renderStatCard = (stat) => (
    <TouchableOpacity
      key={stat.id}
      style={[styles.statCard, { backgroundColor: stat.bgColor }]}
      onPress={() => onStatPress && onStatPress(stat.id)}
      activeOpacity={0.8}
    >
      <View style={styles.statHeader}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getIconName(stat.icon)} 
            size={16} 
            color="#FFFFFF" 
          />
        </View>
        <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
      </View>
      
      <Text style={styles.statValue}>{stat.value}</Text>
      <Text style={styles.statTitle}>{stat.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {stats.map(renderStatCard)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.sm,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Manrope-Medium',
  },
  statValue: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Manrope-Medium',
  },
});
