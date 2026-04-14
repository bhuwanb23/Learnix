import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { COMPANY_QUOTE } from '../constants/applicationData';

export default function CompanyQuote() {
  return (
    <View style={styles.container}>
      <View style={styles.overlay} />
      <View style={styles.content}>
        <MaterialIcons name="format-quote" size={36} color="#0050d4" style={{ marginBottom: 16 }} />
        <Text style={styles.quoteText}>{COMPANY_QUOTE.text}</Text>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            <MaterialIcons name="person" size={20} color="#ffffff" />
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
    marginHorizontal: 16,
    backgroundColor: 'rgba(123, 156, 255, 0.12)',
    borderRadius: 16,
    padding: 28,
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
    backgroundColor: 'rgba(0, 80, 212, 0.06)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  quoteText: {
    fontSize: 17,
    fontFamily: 'Manrope-Medium',
    fontStyle: 'italic',
    color: '#2747a3',
    lineHeight: 26,
    marginBottom: 20,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0050d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2747a3',
  },
  authorRole: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: 'rgba(39, 71, 163, 0.7)',
  },
});
