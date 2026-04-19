import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function HeroCard({ hero }) {
  return (
    <View style={styles.container}>
      {/* Decorative blur circle */}
      <View style={styles.blurCircle} />
      
      <View style={styles.content}>
        <View style={styles.textSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{hero.badge}</Text>
          </View>
          <Text style={styles.title}>{hero.title}</Text>
          <Text style={styles.topic}>{hero.topic}</Text>
        </View>
        
        <TouchableOpacity style={styles.startButton} activeOpacity={0.85}>
          <MaterialIcons name="play-circle" size={24} color="#0050d4" />
          <Text style={styles.startButtonText}>Start Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 12,
    padding: 32,
    backgroundColor: '#0050d4',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  blurCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    gap: 24,
  },
  textSection: {
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#f1f2ff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '800',
    color: '#f1f2ff',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  topic: {
    fontFamily: 'Manrope-Medium',
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(241, 242, 255, 0.8)',
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: '#0050d4',
  },
});
