import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';

// Import components
import NotesHeader from './components/NotesHeader';
import SearchSection from './components/SearchSection';
import AISummarizeSection from './components/AISummarizeSection';
import TabsSection from './components/TabsSection';
import FilterSection from './components/FilterSection';
import NoteCard from './components/NoteCard';
import FloatingActionButton from './components/FloatingActionButton';

// Import hooks
import { useNotesData } from './hooks/useNotesData';
import { useNotesActions } from './hooks/useNotesActions';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../../constants/theme';

export default function LectureNotesPage({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);

  // Custom hooks
  const {
    notes,
    subjects,
    tabs,
    activeTab,
    activeSubject,
    searchQuery,
    loading,
    error,
    handleTabChange,
    handleSubjectChange,
    handleSearch,
    refreshData,
  } = useNotesData();

  const {
    handleNotePress,
    handleDownload,
    handleAISummarize,
    handleFilter,
    handleSort,
    handleAddNote,
  } = useNotesActions();

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleBackPress = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
    // Navigate to notifications
  };

  const renderNoteCard = ({ item }) => (
    <NoteCard
      note={item}
      onPress={handleNotePress}
      onDownload={handleDownload}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No notes found</Text>
      <Text style={styles.emptySubtext}>
        Try adjusting your search or filter criteria
      </Text>
    </View>
  );

  const renderHeader = () => (
    <>
      <SearchSection
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        subjects={subjects}
        onSubjectPress={handleSubjectChange}
      />
      <AISummarizeSection onSummarizePress={handleAISummarize} />
      <TabsSection tabs={tabs} onTabPress={handleTabChange} />
      <FilterSection
        totalCount={notes.length}
        onFilterPress={handleFilter}
        onSortPress={handleSort}
      />
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <NotesHeader
          onBackPress={handleBackPress}
          onNotificationPress={handleNotificationPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading lecture notes...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <NotesHeader
          onBackPress={handleBackPress}
          onNotificationPress={handleNotificationPress}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NotesHeader
        onBackPress={handleBackPress}
        onNotificationPress={handleNotificationPress}
      />
      
      <FlatList
        data={notes}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          notes.length === 0 && styles.emptyListContent
        ]}
      />
      
      <FloatingActionButton onPress={handleAddNote} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: SPACING.xl * 2,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
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
    paddingHorizontal: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
