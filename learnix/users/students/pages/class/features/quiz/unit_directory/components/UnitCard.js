import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_DIRECTORY_COLORS } from '../constants/unitDirectoryData';

export default function UnitCard({ unit, onPress, onButtonPress }) {
  const handleButtonPress = () => {
    if (onButtonPress) {
      onButtonPress(unit);
    } else if (onPress) {
      onPress(unit);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(unit)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.numberContainer}>
            <Text style={styles.numberText}>{unit.number}</Text>
          </View>
          
          <View style={styles.details}>
            <Text style={styles.title} numberOfLines={2}>{unit.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="list-outline" size={14} color={UNIT_DIRECTORY_COLORS.onSurfaceVariant} />
                <Text style={styles.metaText}>{unit.topics} Topics</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="timer-outline" size={14} color={UNIT_DIRECTORY_COLORS.onSurfaceVariant} />
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
            onPress={handleButtonPress}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>Start</Text>
            <Ionicons name="chevron-forward" size={14} color={UNIT_DIRECTORY_COLORS.onSurface} />
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
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  numberContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.primary,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
    marginBottom: 6,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  statusSection: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: UNIT_DIRECTORY_COLORS.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  startButtonText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: UNIT_DIRECTORY_COLORS.onSurface,
  },
});
