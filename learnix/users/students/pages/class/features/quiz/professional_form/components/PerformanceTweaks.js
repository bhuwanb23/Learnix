import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { QUIZ_SETUP_COLORS } from '../constants/quizSetupData';

export default function PerformanceTweaks({ tweaks, onToggle }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Performance Tweaks</Text>
      <View style={styles.tweaksList}>
        {tweaks.map((tweak, index) => (
          <View key={tweak.id} style={[styles.tweakItem, index > 0 && styles.tweakItemBorder]}>
            <View style={styles.tweakContent}>
              <Text style={styles.tweakTitle}>{tweak.title}</Text>
              <Text style={styles.tweakSubtitle}>{tweak.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, tweak.enabled && styles.toggleEnabled]}
              onPress={() => onToggle(tweak.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.toggleThumb, tweak.enabled && styles.toggleThumbEnabled]} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_SETUP_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: `${QUIZ_SETUP_COLORS.outlineVariant}26`,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_SETUP_COLORS.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  tweaksList: {
    gap: 0,
  },
  tweakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  tweakItemBorder: {
    borderTopWidth: 1,
    borderTopColor: `${QUIZ_SETUP_COLORS.outlineVariant}1A`,
  },
  tweakContent: {
    flex: 1,
  },
  tweakTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_SETUP_COLORS.onSurface,
    marginBottom: 2,
  },
  tweakSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: QUIZ_SETUP_COLORS.onSurfaceVariant,
  },
  toggle: {
    width: 44,
    height: 24,
    backgroundColor: QUIZ_SETUP_COLORS.surfaceContainerHighest,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleEnabled: {
    backgroundColor: QUIZ_SETUP_COLORS.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  toggleThumbEnabled: {
    alignSelf: 'flex-end',
  },
});
