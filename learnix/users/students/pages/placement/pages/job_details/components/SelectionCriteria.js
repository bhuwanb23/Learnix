import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

const criteria = [
  {
    id: '01',
    text: 'Exceptional portfolio showcasing UX research and high-fidelity interface design.',
  },
  {
    id: '02',
    text: 'Proficiency in Figma and advanced prototyping tools (Protopie, Framer).',
  },
  {
    id: '03',
    text: 'Strong communication skills for collaborating with global engineering teams.',
  },
];

export default function SelectionCriteria() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Key Selection Criteria</Text>
      <View style={styles.content}>
        {criteria.map((item, index) => (
          <View key={item.id} style={styles.criteriaItem}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>{item.id}</Text>
            </View>
            <Text style={styles.criteriaText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  content: {
    gap: SPACING.lg,
  },
  criteriaItem: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  criteriaText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
    lineHeight: 22,
  },
});
