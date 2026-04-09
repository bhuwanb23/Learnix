import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/lectureNotesData';

export default function SubjectCard({ subject, onPress }) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: subject.iconBgColor }]}>
          <Ionicons name={subject.icon} size={28} color={subject.iconColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{subject.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{subject.type}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <View style={[styles.dot, { backgroundColor: subject.accentColor }]} />
              <Text style={styles.infoText}>{subject.progress}% Progress</Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={14} color={COLORS.onSurfaceVariant} />
              <Text style={styles.infoText}>Last opened {subject.lastOpened}</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.onSurfaceVariant} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: COLORS.onSurface,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: COLORS.onSurfaceVariant,
  },
  menuButton: {
    padding: 10,
  },
});
