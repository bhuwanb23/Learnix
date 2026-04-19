import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SuccessHeader({ compact = false }) {
  return (
    <View style={styles.container}>
      {/* Decorative glow */}
      <View style={styles.glow} />
      
      {/* Success Icon */}
      <LinearGradient
        colors={['#0050d4', '#0046bb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <MaterialIcons name="check-circle" size={48} color="#ffffff" />
      </LinearGradient>

      {/* Title */}
      <Text style={[styles.title, compact && styles.titleCompact]}>Application Submitted</Text>
      <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
        Your journey with Lumina Systems starts now. We've notified the hiring team about your interest.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(123, 156, 255, 0.15)',
    zIndex: 0,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#2c2f31',
    letterSpacing: -1,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  titleCompact: {
    fontSize: 26,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    alignSelf: 'center',
    width: '100%',
  },
  subtitleCompact: {
    maxWidth: '100%',
  },
});
