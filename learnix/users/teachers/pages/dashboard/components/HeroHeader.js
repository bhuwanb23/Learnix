import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HeroHeader({ header }) {
  return (
    <LinearGradient
      colors={['#2563eb', '#1d4ed8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative glow */}
      <View style={styles.glow} />
      
      <View style={styles.content}>
        <Text style={styles.greeting}>{header.greeting}</Text>
        <Text style={styles.title}>{header.title}, {header.name}</Text>
        
        <View style={styles.stats}>
          {header.stats.map((stat, index) => (
            <View key={index} style={styles.statBadge}>
              <Text style={styles.statText}>{stat.value} {stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 28,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: '#ffffff',
  },
});
