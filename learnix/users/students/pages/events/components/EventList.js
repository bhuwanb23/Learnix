import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';

// Import components
import EventCard from './EventCard';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../constants/theme';

export default function EventList({ 
  events, 
  loading, 
  error, 
  onEventPress, 
  onEventJoin,
  onRefresh,
  refreshing 
}) {
  const renderEvent = ({ item }) => (
    <EventCard
      event={item}
      onPress={onEventPress}
      onJoin={onEventJoin}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Events Found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your filters or check back later
      </Text>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.loadingText}>Loading events...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
    </View>
  );

  if (loading) return renderLoading();
  if (error) return renderError();

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  errorSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
