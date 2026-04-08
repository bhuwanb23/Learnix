import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';

export default function EventCard({ item, index = 0 }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        delay: index * 100,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[
      styles.cardWrapper,
      {
        width: isDesktop ? '48%' : '100%',
        opacity: opacityAnim,
        transform: [
          { scale: scaleAnim },
          { translateY: translateYAnim }
        ]
      }
    ]}>
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={styles.eventImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />

          <View style={styles.topBadges}>
            <View style={[styles.categoryBadge, { backgroundColor: item.categoryColor || COLORS.primary }]}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <TouchableOpacity style={styles.favoriteBtn}>
              <MaterialIcons name="favorite-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{item.date.day}</Text>
            <Text style={styles.dateMonth}>{item.date.month}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={14} color={COLORS.gray500} />
              <Text style={styles.metaText}>{item.time}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={14} color={COLORS.gray500} />
              <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>

          <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>

          <View style={styles.footerRow}>
            <View style={styles.attendeesContainer}>
              <View style={styles.avatarStack}>
                {item.avatars.slice(0, 3).map((avatar, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: avatar }}
                    style={[styles.avatar, { marginLeft: idx > 0 ? -10 : 0 }]}
                  />
                ))}
              </View>
              <Text style={styles.attendeeCount}>
                {item.attendees > 3 ? `+${item.attendees - 3} others` : `${item.attendees} attending`}
              </Text>
            </View>

            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: SPACING.lg,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS['2xl'],
    overflow: 'hidden',
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  imageContainer: {
    height: 180,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
  },
  categoryText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  favoriteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    minWidth: 45,
    ...SHADOWS.sm,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  contentContainer: {
    padding: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  attendeeCount: {
    fontSize: 12,
    color: COLORS.gray600,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  eventCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventCardGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '40%', // Start gradient higher for smoother transition
  },
  eventCardDate: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 56,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  eventCardDateDay: {
    color: '#0050d4',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    lineHeight: 22,
  },
  eventCardDateMonth: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventCardFavorite: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  eventCardContent: {
    padding: 24, // Better 8-pt spacing (3 * 8)
  },
  eventCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16, // (2 * 8)
  },
  eventCardCategory: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventCardCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Manrope-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventCardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventCardTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Manrope-SemiBold',
  },
  eventCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  eventCardDescription: {
    fontSize: 15,
    color: '#666666',
    fontFamily: 'Manrope-Regular',
    lineHeight: 22,
    marginBottom: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  eventCardAvatarCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardAvatarCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#666666',
    fontFamily: 'Manrope-Bold',
  },
  eventCardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 16,
  },
  eventCardLocationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666666',
    fontFamily: 'Manrope-Bold',
    flexShrink: 1,
  },
});