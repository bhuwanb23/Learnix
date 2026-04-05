import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function FloatingAddButton() {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      <Text style={styles.icon}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 128,
    right: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0050d4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
    zIndex: 60,
  },
  icon: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
  },
});
