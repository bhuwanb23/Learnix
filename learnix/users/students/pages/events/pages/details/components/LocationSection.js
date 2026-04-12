import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EVENT_DETAILS_COLORS } from '../constants/eventDetailsData';

export default function LocationSection({ location }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Location</Text>
      <View style={styles.card}>
        <View style={styles.mapContainer}>
          <Image source={{ uri: location.mapImage }} style={styles.mapImage} />
          <View style={styles.mapOverlay} />
        </View>
        <View style={styles.content}>
          <View style={styles.locationInfo}>
            <MaterialIcons name="location-on" size={24} color={EVENT_DETAILS_COLORS.primary} />
            <View style={styles.textContainer}>
              <Text style={styles.locationName}>{location.name}</Text>
              <Text style={styles.locationAddress}>{location.address}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.mapsLink} activeOpacity={0.7}>
            <Text style={styles.mapsLinkText}>Open in Google Maps</Text>
            <MaterialIcons name="open-in-new" size={16} color={EVENT_DETAILS_COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
    marginBottom: 16,
  },
  card: {
    backgroundColor: EVENT_DETAILS_COLORS.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapContainer: {
    height: 192,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${EVENT_DETAILS_COLORS.primary}15`,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  textContainer: {
    flex: 1,
  },
  locationName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
    marginBottom: 4,
  },
  locationAddress: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: EVENT_DETAILS_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  mapsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapsLinkText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.primary,
  },
});
