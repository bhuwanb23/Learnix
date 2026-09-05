import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UNIT_COLORS } from '../constants/unitListData';

export default function UnitListHeader({ onBack }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={UNIT_COLORS.primary} />
      
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={UNIT_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Subject Details</Text>
      </View>

      <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} onPress={() => Alert.alert('Options', 'Subject options will appear here.')}>
        <Ionicons name="ellipsis-vertical" size={20} color={UNIT_COLORS.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    height: 56,
    backgroundColor: UNIT_COLORS.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: UNIT_COLORS.primary,
    letterSpacing: -0.3,
  },
  menuButton: {
    padding: 8,
  },
});
