import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  RefreshControl,
} from 'react-native';
import {
  useStudentResponsive,
  STUDENT_MAX_CONTENT_WIDTH,
} from '../../hooks/useStudentResponsive';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../../../constants/theme';
import { STUDENT_HOME_FONT } from '../../constants/studentHomeTypography';

// Import components
import HeroSection from './components/HeroSection';
import EventCard from './components/EventCard';
import Sidebar from './components/Sidebar';
import EventDetailsPage from './pages/details/details';

// Import data
import {
  DISCOVERY_EVENTS,
  MY_REGISTRATIONS,
  EVENT_STATS,
  TRENDING_TAGS,
  HERO_STATS,
  EVENT_SEARCH_EXAMPLES,
} from './constants/eventData';

export default function EventsPage({ studentHeader }) {
  const { isDesktop, horizontalPadding } = useStudentResponsive();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'details'
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  // Handle event card press - navigate to details
  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setCurrentView('details');
  };

  // Navigate back to list
  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEvent(null);
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

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DISCOVERY_EVENTS;
    return DISCOVERY_EVENTS.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const ListHeader = () => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {studentHeader}
      <HeroSection
        featuredEvent={filteredEvents[0] ?? DISCOVERY_EVENTS[0]}
        stats={HERO_STATS}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchExamples={EVENT_SEARCH_EXAMPLES}
      />
      <View style={styles.discoverHeader}>
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
          {filteredEvents.map((event, index) => <EventCard key={event.id} item={event} index={index} onPress={handleEventPress} />)}
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
      {/* Show Event Details Page */}
      {currentView === 'details' ? (
        <EventDetailsPage
          navigation={{ goBack: handleBackToList }}
          route={{ params: { event: selectedEvent } }}
        />
      ) : (
        <>
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
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding },
            ]}
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
        </>
      )}
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
    maxWidth: STUDENT_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 0,
  },
  discoverTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  discoverTitle: {
    fontSize: STUDENT_HOME_FONT.sectionTitle,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  discoverSubtitle: {
    fontSize: STUDENT_HOME_FONT.bodySecondary,
    color: '#595c5e',
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
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
    fontSize: STUDENT_HOME_FONT.quickActionLabel,
    fontFamily: 'Manrope-Bold',
  },
  desktopGrid: {
    flexDirection: 'row',
    maxWidth: STUDENT_MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    width: '100%',
    gap: 40,
    paddingHorizontal: 0,
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
    gap: 20,
    width: '100%',
    justifyContent: 'space-between',
  },
  mobileEventCardWrapper: {
    width: '100%',
    alignSelf: 'stretch',
    marginBottom: 0,
    paddingHorizontal: 0,
  },
});
