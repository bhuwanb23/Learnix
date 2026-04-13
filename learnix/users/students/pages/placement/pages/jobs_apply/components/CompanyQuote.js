import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';
import { COMPANY_QUOTE } from '../constants/applicationData';

export default function CompanyQuote() {
  return (
    <View style={styles.container}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Ionicons name="quote" size={32} color={COLORS.primaryContainer} style={{ marginBottom: SPACING.md }} />
        <Text style={styles.quoteText}>{COMPANY_QUOTE.text}</Text>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            <Ionicons name="person" size={20} color={COLORS.white} />
          </View>
          <View>
            <Text style={styles.authorName}>{COMPANY_QUOTE.author}</Text>
            <Text style={styles.authorRole}>{COMPANY_QUOTE.role}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    backgroundColor: 'rgba(123, 156, 255, 0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xxl + SPACING.md,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 80, 212, 0.05)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  quoteText: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans-Italic',
    fontStyle: 'italic',
    color: COLORS.onPrimaryContainer,
    lineHeight: 26,
    marginBottom: SPACING.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: COLORS.onPrimaryContainer,
  },
  authorRole: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: 'rgba(39, 71, 163, 0.7)',
  },
});
