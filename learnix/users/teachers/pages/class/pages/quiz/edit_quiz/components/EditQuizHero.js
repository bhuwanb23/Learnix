import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QUIZ_TITLE, QUIZ_DESCRIPTION } from '../constants/quizConstants';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function EditQuizHero() {
  return (
    <View style={styles.hero}>
      <View style={styles.heroContent}>
        <Text style={styles.heroLabel}>Quiz Editor</Text>
        <Text style={styles.heroTitle}>{QUIZ_TITLE}</Text>
        <Text style={styles.heroDesc}>{QUIZ_DESCRIPTION}</Text>
      </View>
      <MaterialIcons name="quiz" size={80} color="#0050d4" style={styles.heroIcon} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#7b9cff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 4,
  },
  heroDesc: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#f1f2ff',
    marginTop: 8,
    opacity: 0.9,
  },
  heroIcon: {
    opacity: 0.12,
    position: 'absolute',
    right: 10,
    top: 10,
  },
});
