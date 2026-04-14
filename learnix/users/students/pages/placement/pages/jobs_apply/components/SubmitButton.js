import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SubmitButton({ isDisabled, onPress }) {
  const handlePress = () => {
    console.log('SubmitButton pressed, isDisabled:', isDisabled);
    if (!isDisabled && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isDisabled && styles.containerDisabled
      ]} 
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={isDisabled}
    >
      <LinearGradient
        colors={['#0050d4', '#0046bb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.buttonText}>Confirm Application</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  containerDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  gradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});
