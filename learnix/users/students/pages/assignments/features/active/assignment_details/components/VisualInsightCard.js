import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ACTIVE_ASSIGNMENT_COLORS } from '../constants/activeAssignmentData';

export default function VisualInsightCard({ assignment }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: assignment.visualAsset.imageUrl }} style={styles.image} />
      <View style={styles.overlay}>
        <Text style={styles.label}>{assignment.visualAsset.label}</Text>
        <Text style={styles.quote}>{assignment.visualAsset.quote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  label: {
    fontFamily: 'Manrope-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  quote: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
  },
});
