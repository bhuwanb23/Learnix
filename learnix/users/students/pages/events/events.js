import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  StatusBar,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

// Import components
import HeroSection from './components/HeroSection';
import SearchFilter from './components/SearchFilter';
import EventCard from './components/EventCard';
import Sidebar from './components/Sidebar';

// Import data
import { EVENT_CATEGORIES, DISCOVERY_EVENTS, MY_REGISTRATIONS, EVENT_STATS, TRENDING_TAGS } from './constants/eventData';

export default function EventsPage() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState(DISCOVERY_EVENTS);

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

  const handleEventPress = (event) => {
    navigation.navigate('EventDetails', { event });
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
        events={DISCOVERY_EVENTS}
        setFilteredEvents={setFilteredEvents}
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
          {DISCOVERY_EVENTS.map((event, index) => <EventCard key={event.id} item={event} index={index} onPress={handleEventPress} />)}
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <Animated.FlatList
        data={isDesktop ? [{ id: 'desktop' }] : filteredEvents}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) =>
          isDesktop ? renderDesktopLayout() : (
            <Animated.View style={[styles.mobileEventCardWrapper, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}>
              <EventCard item={item} index={index} onPress={handleEventPress} />
            </Animated.View>
          )
        }
        contentContainerStyle={styles.listContent}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },

  listContent: {
    paddingBottom: 40,
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
    marginBottom: 20,
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
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    fontFamily: 'PlusJakartaSans-ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  discoverSubtitle: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Manrope-Medium',
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
    fontFamily: 'Manrope-SemiBold',
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
    marginBottom: 20,
    paddingHorizontal: 16,
  },
});
