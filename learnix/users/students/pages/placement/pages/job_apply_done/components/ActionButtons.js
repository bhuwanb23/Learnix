import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ActionButtons({ onViewApplication, onBackToJobs }) {
  return (
    <View style={styles.container}>
      {/* Primary Button - View Application */}
      <TouchableOpacity 
        style={styles.primaryButton} 
        activeOpacity={0.85}
        onPress={onViewApplication}
      >
        <LinearGradient
          colors={['#0050d4', '#0046bb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.primaryButtonText}>View Application</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Secondary Button - Back to Jobs */}
      <TouchableOpacity 
        style={styles.secondaryButton} 
        activeOpacity={0.7}
        onPress={onBackToJobs}
      >
        <Text style={styles.secondaryButtonText}>Back to Jobs</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#dfe3e6',
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
});
