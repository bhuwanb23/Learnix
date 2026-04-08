import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

// Import components
import HeroSection from './components/HeroSection';
import SearchFilter from './components/SearchFilter';
import EventCard from './components/EventCard';
import Sidebar from './components/Sidebar';

// Import data
import { EVENT_CATEGORIES, DISCOVERY_EVENTS, MY_REGISTRATIONS, EVENT_STATS, TRENDING_TAGS } from './constants/eventData';

export default function EventsPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  // Header Animation (Fade in on scroll)
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [-20, 0],
    extrapolate: 'clamp',
  });

  const ListHeader = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <HeroSection />
      <SearchFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categories={EVENT_CATEGORIES}
      />
      <View style={[styles.discoverHeader, { paddingHorizontal: isDesktop ? 0 : (isTablet ? 32 : 16) }]}>
        <View style={styles.discoverTextContainer}>
          <Text style={styles.discoverTitle}>Upcoming Discoveries</Text>
          <Text style={styles.discoverSubtitle}>Selected curated events based on your interests</Text>
        </View>
        <TouchableOpacity style={styles.viewMapBtn} activeOpacity={0.7}>
          <Text style={styles.viewMapText}>View Map</Text>
          <MaterialIcons name="map" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderDesktopLayout = () => (
    <Animated.View style={[styles.desktopGrid, { opacity: fadeAnim }]}>
      <View style={styles.desktopLeft}>
        <View style={styles.eventsGrid}>
          {DISCOVERY_EVENTS.map((event, index) => <EventCard key={event.id} item={event} index={index} />)}
        </View>
      </View>
      <View style={styles.desktopRight}>
        <Sidebar
          registrations={MY_REGISTRATIONS}
          stats={EVENT_STATS}
          trendingTags={TRENDING_TAGS}
        />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Animated Sticky Header */}
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
        <Text style={styles.stickyHeaderTitle}>Events</Text>
      </Animated.View>

      <Animated.FlatList
        data={isDesktop ? [{ id: 'desktop' }] : DISCOVERY_EVENTS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) =>
          isDesktop ? renderDesktopLayout() : (
            <Animated.View style={[styles.mobileEventCardWrapper, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}>
              <EventCard item={item} index={index} />
            </Animated.View>
          )
        }
        contentContainerStyle={styles.listContent}
        ListFooterComponent={!isDesktop ? () => (
          <Animated.View style={[styles.mobileSidebarWrapper, { opacity: fadeAnim }]}>
            <Sidebar
              registrations={MY_REGISTRATIONS}
              stats={EVENT_STATS}
              trendingTags={TRENDING_TAGS}
            />
          </Animated.View>
        ) : null}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      />

      {/* Modern Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <MaterialIcons name="add" size={28} color={COLORS.white} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 100 : 80,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  stickyHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  listContent: {
    paddingBottom: 120,
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 48,
    marginBottom: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  discoverTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  discoverTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  discoverSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    lineHeight: 20,
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 80, 212, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  viewMapText: {
    color: '#0050d4',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  desktopGrid: {
    flexDirection: 'row',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    gap: 40,
    paddingHorizontal: 40,
  },
  desktopLeft: {
    flex: 8,
  },
  desktopRight: {
    flex: 4,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
    justifyContent: 'space-between',
  },
  mobileEventCardWrapper: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  mobileSidebarWrapper: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 40,
  },
});
