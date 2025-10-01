import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../constants/theme';

export default function EventHeader({ onSearch, onNotification }) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Ionicons name="calendar-days" size={24} color="#3B82F6" />
        <Text style={styles.title}>EventHub</Text>
      </View>
      
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.actionButton} onPress={onSearch}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={onNotification}>
          <Ionicons name="notifications" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
});
