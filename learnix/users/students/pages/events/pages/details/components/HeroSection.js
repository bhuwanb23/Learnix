import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EVENT_DETAILS_COLORS } from '../constants/eventDetailsData';

export default function HeroSection({ event, onBack, onShare }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: event.image }} style={styles.image} />
      <View style={styles.gradient} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 40 }} />
        <TouchableOpacity onPress={onShare} style={styles.iconButton}>
          <MaterialIcons name="share" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomContent}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{event.badge}</Text>
        </View>
        <Text style={styles.title}>
          {event.title.split(' in ')[0]}{'\n'}
          <Text style={styles.highlightedText}>in {event.subtitle}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
  },
  badge: {
    backgroundColor: EVENT_DETAILS_COLORS.tertiaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onTertiaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 38,
  },
  highlightedText: {
    color: '#ffffff',
  },
});
