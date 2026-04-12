import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { EVENT_DETAILS_COLORS } from '../constants/eventDetailsData';

export default function SpeakersSection({ speakers }) {
  const getColorForSpeaker = (color) => {
    switch (color) {
      case 'primary':
        return { ring: `${EVENT_DETAILS_COLORS.primary}15`, badge: EVENT_DETAILS_COLORS.primary, bg: EVENT_DETAILS_COLORS.surfaceContainerHigh };
      case 'secondary':
        return { ring: `${EVENT_DETAILS_COLORS.secondary}15`, badge: EVENT_DETAILS_COLORS.secondary, bg: EVENT_DETAILS_COLORS.surfaceContainerHigh };
      case 'tertiary':
        return { ring: `${EVENT_DETAILS_COLORS.tertiary}15`, badge: EVENT_DETAILS_COLORS.tertiary, bg: EVENT_DETAILS_COLORS.surfaceContainerHigh };
      default:
        return { ring: `${EVENT_DETAILS_COLORS.primary}15`, badge: EVENT_DETAILS_COLORS.primary, bg: EVENT_DETAILS_COLORS.surfaceContainerHigh };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Featured Speakers</Text>
        <Text style={styles.slideHint}>Slide to view</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {speakers.map((speaker) => {
          const colors = getColorForSpeaker(speaker.color);
          return (
            <View key={speaker.id} style={styles.speakerCard}>
              <Image 
                source={{ uri: speaker.avatar }} 
                style={[styles.avatar, { ringColor: colors.ring }]} 
              />
              <View style={[styles.ring, { borderColor: colors.ring }]} />
              <Text style={styles.speakerName}>{speaker.name}</Text>
              <Text style={styles.speakerRole}>{speaker.role}</Text>
              <View style={[styles.specialtyBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.specialtyText, { color: colors.badge }]}>{speaker.specialty}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
  },
  slideHint: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  carousel: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 8,
  },
  speakerCard: {
    width: 180,
    backgroundColor: EVENT_DETAILS_COLORS.surfaceContainerLowest,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  ring: {
    position: 'absolute',
    top: 20,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
  },
  speakerName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: EVENT_DETAILS_COLORS.onSurface,
    marginBottom: 4,
    textAlign: 'center',
  },
  speakerRole: {
    fontFamily: 'Manrope-Medium',
    fontSize: 12,
    fontWeight: '500',
    color: EVENT_DETAILS_COLORS.onSurfaceVariant,
    marginBottom: 12,
    textAlign: 'center',
  },
  specialtyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  specialtyText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
  },
});
