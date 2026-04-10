import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_SETUP_COLORS } from '../constants/quizSetupData';

export default function ModeSelection({ modes, selectedMode, onSelect }) {
  return (
    <View style={styles.container}>
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id;
        return (
          <TouchableOpacity
            key={mode.id}
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={() => onSelect(mode.id)}
            activeOpacity={0.7}
          >
            <View style={styles.radioContainer}>
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </View>

            <View style={[styles.iconContainer, { backgroundColor: mode.bgColor }]}>
              <Ionicons name={mode.icon} size={24} color={mode.color} />
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>{mode.title}</Text>
              <Text style={styles.description}>{mode.description}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  card: {
    backgroundColor: QUIZ_SETUP_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: `${QUIZ_SETUP_COLORS.outlineVariant}1A`,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  selectedCard: {
    borderColor: `${QUIZ_SETUP_COLORS.primary}4D`,
  },
  radioContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: QUIZ_SETUP_COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: QUIZ_SETUP_COLORS.primary,
    backgroundColor: QUIZ_SETUP_COLORS.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
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
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_SETUP_COLORS.onSurface,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: QUIZ_SETUP_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
});
