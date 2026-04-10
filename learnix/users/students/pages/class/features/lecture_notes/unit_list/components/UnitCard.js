import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_COLORS } from '../constants/unitListData';

export default function UnitCard({ unit, onPress }) {
  const isCompleted = unit.status === 'completed';
  const isInProgress = unit.status === 'in-progress';
  const isLocked = unit.status === 'locked';

  const renderProgressCircle = () => {
    if (isLocked) {
      return (
        <View style={styles.progressCircleContainer}>
          <Ionicons name="lock-closed" size={24} color={UNIT_COLORS.onSurfaceVariant} />
        </View>
      );
    }

    return (
      <View style={styles.progressCircleContainer}>
        <View style={styles.circleBackground} />
        <View style={styles.circleProgress} />
        <Text style={[styles.progressText, { color: unit.iconColor }]}>
          {unit.progress}%
        </Text>
      </View>
    );
  };

  const renderActionButton = () => {
    if (isCompleted) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.completedButton]} activeOpacity={0.7}>
          <Ionicons name="checkmark-circle" size={20} color={UNIT_COLORS.onSurfaceVariant} />
          <Text style={styles.completedButtonText}>Completed</Text>
        </TouchableOpacity>
      );
    }

    if (isInProgress) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.continueButton]} activeOpacity={0.7}>
          <Text style={styles.continueButtonText}>Mark unit complete</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isLocked && styles.lockedContainer
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLocked}
    >
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: unit.iconBgColor }]}>
            <Ionicons name={unit.icon} size={28} color={unit.iconColor} />
          </View>

          <View style={styles.content}>
            <Text style={[styles.unitLabel, { color: unit.iconColor }]}>Unit {unit.unitNumber}</Text>
            <Text style={styles.title}>{unit.title}</Text>
            <Text style={styles.description}>{unit.description}</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>
              {isCompleted ? 'Completed' : (isLocked ? 'Locked' : 'In Progress')}
            </Text>
            {renderProgressCircle()}
          </View>
        </View>
      </View>

      {(isCompleted || isInProgress) && (
        <View style={styles.expansionArea}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lectures</Text>
              <Text style={styles.statValue}>
                {String(unit.lecturesCompleted).padStart(2, '0')} / {String(unit.totalLectures).padStart(2, '0')}
              </Text>
            </View>

            {isCompleted && unit.timeSpent && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Time Spent</Text>
                <Text style={styles.statValue}>{unit.timeSpent}</Text>
              </View>
            )}

            {isInProgress && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Status</Text>
                <Text style={[styles.statValue, { color: unit.iconColor }]}>{unit.statusText}</Text>
              </View>
            )}
          </View>

          {renderActionButton()}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UNIT_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  lockedContainer: {
    opacity: 0.75,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  leftSection: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_COLORS.onSurface,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: UNIT_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  progressInfo: {
    alignItems: 'center',
    gap: 6,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressCircleContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    ...StyleSheet.absoluteFillObject,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  circleProgress: {
    ...StyleSheet.absoluteFillObject,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#0050d4',
    borderRightColor: '#0050d4',
    transform: [{ rotate: '45deg' }],
  },
  progressText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    zIndex: 1,
  },
  expansionArea: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: UNIT_COLORS.surfaceContainerLow,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_COLORS.onSurface,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  completedButton: {
    backgroundColor: UNIT_COLORS.surfaceContainerHigh,
  },
  completedButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_COLORS.onSurfaceVariant,
  },
  continueButton: {
    backgroundColor: UNIT_COLORS.primary,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
});
