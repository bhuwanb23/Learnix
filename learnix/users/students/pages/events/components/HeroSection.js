import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';
import { DISCOVERY_EVENTS, HERO_STATS, EVENT_SEARCH_EXAMPLES } from '../constants/eventData';
import { STUDENT_HOME_FONT } from '../../../constants/studentHomeTypography';
import EventSearchBar from './EventSearchBar';

function coverUri(item) {
  if (item?.image) return item.image;
  return `https://picsum.photos/seed/learnix-hero-${item?.id ?? '0'}/1200/640`;
}

function truncate(text, maxLen) {
  if (!text) return '';
  const t = text.trim();
  return t.length <= maxLen ? t : `${t.slice(0, maxLen).trim()}…`;
}

export default function HeroSection({
  featuredEvent,
  stats = HERO_STATS,
  searchQuery = '',
  onSearchChange = () => {},
  searchExamples = EVENT_SEARCH_EXAMPLES,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const event = featuredEvent ?? DISCOVERY_EVENTS[0];
  const imageUri = useMemo(() => coverUri(event), [event?.id, event?.image]);

  const heroHeight = isDesktop ? 320 : isTablet ? 384 : 296;
  const titleSize = STUDENT_HOME_FONT.heroTitle;
  const descSize = STUDENT_HOME_FONT.heroSubtitle;
  const contentPadH = isDesktop ? 24 : isTablet ? 20 : 16;
  const contentPadV = isDesktop ? 22 : isTablet ? 18 : 16;
  const descLineHeight = Math.round(descSize * 1.5);
  const gapBelowHeader = isDesktop ? SPACING.md : isTablet ? SPACING.md : 12;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 720,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 22,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const categoryTint = event.categoryColor || COLORS.primary;
  const badgeLabel = (event.category || 'Featured').toUpperCase();

  return (
    <View style={styles.heroBlock}>
    <View style={[styles.heroOuter, { height: heroHeight, marginTop: gapBelowHeader }]}>
      <Image source={{ uri: imageUri }} style={styles.heroImage} />
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.88)', 'rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.92)']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View
        style={[
          styles.heroContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            paddingHorizontal: contentPadH,
            paddingVertical: contentPadV,
          },
        ]}
      >
        <View style={styles.heroInner}>
          <View style={[styles.heroBadge, { borderColor: `${categoryTint}99`, backgroundColor: `${categoryTint}33` }]}>
            <View style={[styles.badgeDot, { backgroundColor: categoryTint }]} />
            <Text style={styles.heroBadgeText}>{badgeLabel}</Text>
          </View>

          <Text
            style={[styles.heroTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.12) }]}
            numberOfLines={2}
          >
            {event.title}
          </Text>

          <Text
            style={[styles.heroDescription, { fontSize: descSize, lineHeight: descLineHeight }]}
            numberOfLines={3}
          >
            {truncate(event.description, 180)}
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Reserve spot</Text>
              <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Explore schedule</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.attendees}</Text>
              <Text style={styles.statLabel}>Attendees</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.speakers}</Text>
              <Text style={styles.statLabel}>Speakers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.workshops}</Text>
              <Text style={styles.statLabel}>Workshops</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>

    <EventSearchBar
      value={searchQuery}
      onChangeText={onSearchChange}
      examples={searchExamples}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    width: '100%',
  },
  heroOuter: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.black,
    ...SHADOWS.md,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  heroInner: {
    maxWidth: 1120,
    width: '100%',
    alignSelf: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  heroBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'Manrope-Bold',
  },
  heroTitle: {
    fontWeight: '800',
    color: COLORS.white,
    fontFamily: 'PlusJakartaSans-ExtraBold',
    marginBottom: 10,
    letterSpacing: -0.6,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Manrope-Regular',
    marginBottom: SPACING.md,
    maxWidth: 520,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
    flexShrink: 1,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    flexShrink: 1,
  },
  secondaryBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontFamily: 'Manrope-SemiBold',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 52,
  },
  statValue: {
    color: COLORS.white,
    fontSize: STUDENT_HOME_FONT.emphasis,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: STUDENT_HOME_FONT.caption,
    marginTop: 2,
    fontFamily: 'Manrope-Medium',
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 14,
  },
});
