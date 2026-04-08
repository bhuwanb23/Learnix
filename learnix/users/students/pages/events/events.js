import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // List Header Component (Hero + Filters + Discover Header)
  const ListHeader = () => (
    <>
      <HeroSection />
      <SearchFilter 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categories={EVENT_CATEGORIES}
      />
      <View style={styles.discoverHeader}>
        <View>
          <Text style={styles.discoverTitle}>Upcoming Discoveries</Text>
          <Text style={styles.discoverSubtitle}>Selected curated events based on your interests</Text>
        </View>
        <TouchableOpacity style={styles.viewMapBtn}>
          <Text style={styles.viewMapText}>View Map</Text>
          <MaterialIcons name="map" size={16} color="#0050d4" />
        </TouchableOpacity>
      </View>
    </>
  );

  // Desktop Layout Wrapper
  const renderDesktopLayout = () => (
    <View style={styles.desktopGrid}>
      <View style={styles.desktopLeft}>
        <View style={styles.eventsGrid}>
          {DISCOVERY_EVENTS.map(event => <EventCard key={event.id} item={event} />)}
        </View>
      </View>
      <View style={styles.desktopRight}>
        <Sidebar 
          registrations={MY_REGISTRATIONS}
          stats={EVENT_STATS}
          trendingTags={TRENDING_TAGS}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <FlatList
        data={isDesktop ? [{ id: 'desktop' }] : DISCOVERY_EVENTS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => isDesktop ? renderDesktopLayout() : <View style={styles.mobileEventCardWrapper}><EventCard item={item} /></View>}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={!isDesktop ? () => (
          <View style={styles.mobileSidebarWrapper}>
            <Sidebar 
              registrations={MY_REGISTRATIONS}
              stats={EVENT_STATS}
              trendingTags={TRENDING_TAGS}
            />
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  listContent: {
    paddingBottom: 100, // Space for FAB and general breathing room
  },
  discoverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginTop: 64,
    marginBottom: 32,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  discoverTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  discoverSubtitle: {
    fontSize: 16,
    color: '#595c5e',
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  viewMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMapText: {
    color: '#0050d4',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  mobileEventCardWrapper: {
    paddingHorizontal: 24,
  },
  desktopGrid: {
    flexDirection: 'row',
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    gap: 32,
    paddingHorizontal: 24,
  },
  desktopLeft: {
    flex: 8,
  },
  desktopRight: {
    flex: 4,
  },
  mobileSidebarWrapper: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0050d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 40,
  },
});