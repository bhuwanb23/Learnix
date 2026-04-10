import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function FloatingAddButton() {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      <MaterialIcons name="add" size={32} color="#ffffff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 128, // bottom-32
    right: 32, // right-8
    width: 64, // w-16
    height: 64, // h-16
    borderRadius: 32, // rounded-full
    backgroundColor: '#0050d4', // bg-primary
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0050d4', // shadow-[0_12px_32px_rgba(0,80,212,0.4)]
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
    zIndex: 60, // z-[60]
  },
});
