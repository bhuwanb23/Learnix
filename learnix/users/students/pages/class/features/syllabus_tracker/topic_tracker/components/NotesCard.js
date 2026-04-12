import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TOPIC_TRACKER_COLORS } from '../constants/topicTrackerData';

export default function NotesCard({ data, onPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.textSection}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.description}>{data.description}</Text>
        </View>
        <View style={styles.statusBadge}>
          <MaterialIcons name="check-circle" size={14} color={TOPIC_TRACKER_COLORS.onSecondaryFixedVariant} />
          <Text style={styles.statusText}>{data.status}</Text>
        </View>
      </View>

      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: data.imageUrl }}
          style={styles.image}
        />
        <View style={styles.imageOverlay} />
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{data.buttonText}</Text>
        <MaterialIcons name="open-in-new" size={18} color={TOPIC_TRACKER_COLORS.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TOPIC_TRACKER_COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onSurface,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: TOPIC_TRACKER_COLORS.onSurfaceVariant,
    lineHeight: 17,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOPIC_TRACKER_COLORS.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: TOPIC_TRACKER_COLORS.onSecondaryFixedVariant,
    letterSpacing: 0.5,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 21 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${TOPIC_TRACKER_COLORS.primary}1A`,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOPIC_TRACKER_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: TOPIC_TRACKER_COLORS.onPrimary,
  },
});
