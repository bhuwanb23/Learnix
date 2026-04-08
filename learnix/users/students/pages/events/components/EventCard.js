import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function EventCard({ item }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  return (
    <TouchableOpacity style={[styles.eventCard, { width: isDesktop ? '48%' : '100%' }]} activeOpacity={0.9}>
      <View style={styles.eventCardImageContainer}>
        <Image source={{ uri: item.image }} style={styles.eventCardImage} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.eventCardGradient} />
        <View style={styles.eventCardDate}>
          <Text style={styles.eventCardDateDay}>{item.date.day}</Text>
          <Text style={styles.eventCardDateMonth}>{item.date.month}</Text>
        </View>
        <TouchableOpacity style={styles.eventCardFavorite}>
          <MaterialIcons name="favorite" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <View style={styles.eventCardContent}>
        <View style={styles.eventCardMeta}>
          <View style={[styles.eventCardCategory, { backgroundColor: item.categoryColor }]}>
            <Text style={[styles.eventCardCategoryText, { color: item.categoryTextColor }]}>{item.category}</Text>
          </View>
          <View style={styles.eventCardTime}>
            <MaterialIcons name="schedule" size={14} color="#595c5e" />
            <Text style={styles.eventCardTimeText}>{item.time}</Text>
          </View>
        </View>
        <Text style={styles.eventCardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.eventCardDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.eventCardFooter}>
          <View style={styles.eventCardAvatars}>
            {item.avatars.map((avatar, idx) => (
              <Image key={idx} source={{ uri: avatar }} style={[styles.eventCardAvatar, { marginLeft: idx > 0 ? -10 : 0 }]} />
            ))}
            <View style={[styles.eventCardAvatarCount, { marginLeft: -10 }]}>
              <Text style={styles.eventCardAvatarCountText}>+{item.attendees - item.avatars.length}</Text>
            </View>
          </View>
          <View style={styles.eventCardLocation}>
            <MaterialIcons name="location-on" size={14} color="#595c5e" />
            <Text style={styles.eventCardLocationText}>{item.location}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
  },
  eventCardImageContainer: {
    height: 224,
    position: 'relative',
    overflow: 'hidden',
  },
  eventCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventCardGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  eventCardDate: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  eventCardDateDay: {
    color: '#0050d4',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    lineHeight: 20,
  },
  eventCardDateMonth: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  eventCardFavorite: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  eventCardContent: {
    padding: 24,
  },
  eventCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventCardCategory: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventCardCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase',
  },
  eventCardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventCardTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#595c5e',
    fontFamily: 'Manrope-Medium',
  },
  eventCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
  },
  eventCardDescription: {
    fontSize: 14,
    color: '#595c5e',
    fontFamily: 'Manrope-Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventCardAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCardAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  eventCardAvatarCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dfe3e6',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardAvatarCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#595c5e',
    fontFamily: 'Manrope-Bold',
  },
  eventCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventCardLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#595c5e',
    fontFamily: 'Manrope-SemiBold',
  },
});