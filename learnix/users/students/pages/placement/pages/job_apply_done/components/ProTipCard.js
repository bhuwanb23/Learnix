import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ProTipCard() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="lightbulb" size={24} color="#a23800" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Pro-Tip for Lumina</Text>
            <Text style={styles.subtitle}>
              Candidates who engage with the community portal are 30% more likely to advance.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Explore Community</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 12,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(162, 56, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: '#595c5e',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#dfe3e6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    flexShrink: 0,
  },
  buttonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: '#2c2f31',
  },
});
