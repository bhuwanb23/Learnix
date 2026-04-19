import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function EventSearchBar({
  value,
  onChangeText,
  examples = [],
  placeholder = 'Search events, locations, categories…',
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.fieldRow}>
        <MaterialIcons name="search" size={20} color={COLORS.gray400} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray400}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          {...Platform.select({
            web: { outlineStyle: 'none' },
          })}
        />
        {value?.length > 0 ? (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search"
          >
            <MaterialIcons name="close" size={18} color={COLORS.gray400} />
          </TouchableOpacity>
        ) : null}
      </View>

      {examples.length > 0 ? (
        <View style={styles.examplesBlock}>
          <Text style={styles.examplesLabel}>Example events</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.examplesScroll}
          >
            {examples.map((ex) => (
              <TouchableOpacity
                key={ex.label}
                style={styles.exampleChip}
                onPress={() => onChangeText(ex.query)}
                activeOpacity={0.75}
              >
                <Text style={styles.exampleChipText}>{ex.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',
    marginTop: SPACING.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
  },
  examplesBlock: {
    marginTop: SPACING.sm,
  },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray500,
    fontFamily: 'Manrope-Bold',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  examplesScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  exampleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'Manrope-SemiBold',
  },
});
