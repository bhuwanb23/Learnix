import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function CriticalAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {alerts.map((alert) => (
        <LinearGradient
          key={alert.id}
          colors={['#FEF2F2', '#FEE2E2']}
          style={styles.alertCard}
        >
          <View style={styles.alertContent}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="warning-outline" 
                size={20} 
                color="#EF4444" 
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </View>
          </View>
          
          {/* Decorative border */}
          <View style={styles.leftBorder} />
        </LinearGradient>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  alertCard: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#991B1B',
    marginBottom: SPACING.xs,
  },
  alertMessage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#B91C1C',
    lineHeight: 16,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#EF4444',
  },
});
