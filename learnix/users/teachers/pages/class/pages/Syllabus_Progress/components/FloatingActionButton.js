import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../../constants/theme';

const FloatingActionButton = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.button}>
        <Text style={styles.icon}>+</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 1000,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
    elevation: 8,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default FloatingActionButton;
