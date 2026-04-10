import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEAK_TOPICS_COLORS } from '../constants/weakTopicsData';

export default function WeakTopicsHeader({ onBack }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={WEAK_TOPICS_COLORS.surface} />
      
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.iconButton} 
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={WEAK_TOPICS_COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Learning Gaps</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: WEAK_TOPICS_COLORS.surface,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: WEAK_TOPICS_COLORS.onSurface,
    letterSpacing: -0.3,
  },
});
