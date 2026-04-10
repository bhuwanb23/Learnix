import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_DIRECTORY_COLORS } from '../constants/unitDirectoryData';

export default function UnitCard({ unit, onPress }) {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.numberContainer}>
            <Text style={styles.numberText}>{unit.number}</Text>
          </View>
          
          <View style={styles.details}>
            <Text style={styles.title}>{unit.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="list-outline" size={16} color={UNIT_DIRECTORY_COLORS.onSurfaceVariant} />
                <Text style={styles.metaText}>{unit.topics} Topics</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="timer-outline" size={16} color={UNIT_DIRECTORY_COLORS.onSurfaceVariant} />
                <Text style={styles.metaText}>{unit.duration}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.statusSection}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusText, { color: unit.statusColor }]}>{unit.status}</Text>
          </View>

          <TouchableOpacity 
            style={styles.startButton}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>Start Topic Quiz</Text>
            <Ionicons name="chevron-forward" size={18} color={UNIT_DIRECTORY_COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftSection: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  numberContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.primary,
  },
  details: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusSection: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerHigh,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
  },
});
