/**
 * The inbox.
 *
 * A thin render shell over `useInbox` — all the state and the read/filter/paging
 * logic lives in the hub's hook so that Preferences and Broadcast do not each
 * reimplement the same fetch-and-error handling.
 *
 * Read state is optimistic and reverted on failure, because a tap that silently does
 * nothing is indistinguishable from a broken screen.
 */
import React from 'react';
import { View, FlatList, RefreshControl, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../constants/theme';
import { EmptyState, SkeletonCard } from '../../../../../../components/ui';
import NotificationRow from '../../components/NotificationRow';
import CategoryFilter from '../../components/CategoryFilter';

export default function InboxPage({
  loading,
  refreshing,
  error,
  rows,
  catalogue,
  filters,
  pagination,
  importantUnread,
  isOffice,
  onRefresh,
  onLoadMore,
  onSelectCategory,
  onToggleUnread,
  onToggleImportant,
  onPressRow,
  onToggleRead,
  onMarkAllRead,
  marking,
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  const isFiltered = !!filters.category || filters.unreadOnly || filters.importantOnly;

  const header = (
    <View style={styles.header}>
      <View style={styles.summaryRow}>
        <View>
          <Text style={styles.summary}>
            {pagination.total} {pagination.total === 1 ? 'message' : 'messages'}
            {filters.unreadOnly ? ' · unread only' : ''}
            {filters.category ? ` · ${filters.category}` : ''}
          </Text>
          {importantUnread > 0 && !filters.importantOnly ? (
            <TouchableOpacity onPress={onToggleImportant} style={styles.importantBanner}>
              <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
              <Text style={styles.importantBannerText}>
                {importantUnread} important {importantUnread === 1 ? 'message' : 'messages'} waiting
              </Text>
              <Ionicons name="chevron-forward" size={13} color={theme.colors.error} />
            </TouchableOpacity>
          ) : null}
        </View>

        {pagination.total > 0 ? (
          <TouchableOpacity onPress={onMarkAllRead} disabled={marking} style={styles.markAll} accessibilityRole="button">
            {marking ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <CategoryFilter
        categories={catalogue.categories}
        active={filters.category}
        unreadOnly={filters.unreadOnly}
        importantOnly={filters.importantOnly}
        importantCount={importantUnread}
        onSelect={onSelectCategory}
        onToggleUnread={onToggleUnread}
        onToggleImportant={onToggleImportant}
      />
    </View>
  );

  const footer = pagination.hasMore ? (
    <TouchableOpacity onPress={onLoadMore} style={styles.loadMore} accessibilityRole="button">
      <Text style={styles.loadMoreText}>
        Load more — showing {rows.length} of {pagination.total}
      </Text>
    </TouchableOpacity>
  ) : rows.length > 0 ? (
    <Text style={styles.endOfList}>That is everything.</Text>
  ) : null;

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      renderItem={({ item }) => <NotificationRow row={item} onPress={onPressRow} onToggleRead={onToggleRead} />}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      ListEmptyComponent={
        error ? (
          <EmptyState icon="cloud-offline-outline" title="Could not load your inbox" message={error} />
        ) : isFiltered ? (
          <EmptyState
            icon="funnel-outline"
            title="Nothing here"
            message="No messages match this filter. Try All, or turn off unread-only."
          />
        ) : (
          <EmptyState
            icon="notifications-outline"
            title="No messages yet"
            message="Event reminders, registration confirmations, mentorship decisions and chapter news will land here."
          />
        )
      }
      contentContainerStyle={rows.length === 0 ? styles.emptyWrap : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  header: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  summary: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  importantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    backgroundColor: `${theme.colors.error}0F`,
    alignSelf: 'flex-start',
  },
  importantBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error,
  },
  markAll: {
    marginLeft: 'auto',
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  sep: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
  },
  loadMore: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  endOfList: {
    paddingVertical: theme.spacing.lg,
    textAlign: 'center',
    fontSize: 11.5,
    color: theme.colors.textLight,
  },
  emptyWrap: {
    flexGrow: 1,
  },
});
