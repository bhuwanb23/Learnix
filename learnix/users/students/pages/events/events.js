import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

// Import components
import TabNavigation from './components/TabNavigation';
import SearchBar from './components/SearchBar';
import EventCategories from './components/EventCategories';
import EventList from './components/EventList';
import GroupCard from './components/GroupCard';
import CertificationCard from './components/CertificationCard';
import EventModal from './components/EventModal';

// Import hooks
import { useEvents } from './hooks/useEvents';
import { useEventActions } from './hooks/useEventActions';


// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../constants/theme';

export default function EventsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom hooks
  const {
    events,
    groups,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    joinEvent,
    joinGroup,
  } = useEvents();

  const {
    loading: actionLoading,
    handleJoinEvent,
    handleJoinGroup,
    handleGroupPress,
    handleFilterChange,
    handleSearch,
    handleShareEvent,
  } = useEventActions();

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };


  const handleEventJoin = async (event) => {
    const success = await joinEvent(event.id);
    if (success) {
      handleJoinEvent(event);
    }
  };

  const handleGroupJoin = async (group) => {
    const success = await joinGroup(group.id);
    if (success) {
      handleJoinGroup(group);
    }
  };

  const handleCertificationEnroll = (certification) => {
    console.log('Enrolling in certification:', certification.id);
    // Handle certification enrollment
  };

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleEventModalClose = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const handleSearchPress = () => {
    handleSearch(searchQuery);
  };

  const handleNotificationPress = () => {
    console.log('Notification pressed');
  };

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const renderGroups = () => {
    if (!groups || groups.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Peer Collaboration</Text>
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onPress={handleGroupPress}
            onJoin={handleGroupJoin}
          />
        ))}
      </View>
    );
  };

  const renderCertifications = () => {
    const certifications = events.filter(event => event.status === 'certification');
    if (certifications.length === 0) return null;

    return certifications.map((certification) => (
      <CertificationCard
        key={certification.id}
        certification={certification}
        onPress={handleEventPress}
        onEnroll={handleCertificationEnroll}
      />
    ));
  };

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Search Bar */}
      <SearchBar
        onSearch={handleSearchPress}
        onFilter={() => console.log('Filter pressed')}
      />


      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Event Categories */}
        <EventCategories
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Events List */}
        <EventList
          events={events}
          loading={loading}
          error={error}
          onEventPress={handleEventPress}
          onEventJoin={handleEventJoin}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />

        {/* Certifications */}
        {renderCertifications()}

        {/* Groups */}
        {renderGroups()}
      </ScrollView>

      {/* Event Modal */}
      <EventModal
        event={selectedEvent}
        visible={showEventModal}
        onClose={handleEventModalClose}
        onJoin={handleEventJoin}
        onShare={handleShareEvent}
      />

      {/* Loading Overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
});
