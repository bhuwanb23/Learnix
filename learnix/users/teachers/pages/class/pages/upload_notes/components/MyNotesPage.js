import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';

const MyNotesPage = ({ myNotes, onRefresh, refreshing, onNoteAction }) => {
  const renderNoteItem = (note) => (
    <View key={note.id} style={styles.noteItem}>
      <View style={[styles.fileIcon, { backgroundColor: note.color + '20' }]}>
        <Text style={styles.fileIconText}>{note.icon}</Text>
      </View>
      
      <View style={styles.noteInfo}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {note.title}
        </Text>
        <Text style={styles.noteSubject}>{note.subject}</Text>
        <Text style={styles.noteDetails}>
          {note.date} • {note.size} • {note.views} views
        </Text>
        <View style={styles.tagsContainer}>
          {note.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => onNoteAction(note.id, 'menu')}
        activeOpacity={0.7}
      >
        <Text style={styles.actionIcon}>⋮</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563EB"]}
          tintColor="#2563EB"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search your notes...</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{myNotes.length}</Text>
          <Text style={styles.statLabel}>Total Notes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>156</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
      </View>

      {/* Notes List */}
      <View style={styles.notesContainer}>
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        {myNotes.length > 0 ? (
          myNotes.map(renderNoteItem)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySubtitle}>
              Upload your first lecture notes to get started
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollContent: {
    paddingBottom: 20
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8
  },
  searchIcon: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF'
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterIcon: {
    fontSize: 16,
    color: '#6B7280'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  notesContainer: {
    paddingHorizontal: 16,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  fileIconText: {
    fontSize: 20
  },
  noteInfo: {
    flex: 1,
    minWidth: 0
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  noteSubject: {
    fontSize: 14,
    color: '#2563EB',
    marginBottom: 4
  },
  noteDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  tagText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '500'
  },
  actionButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionIcon: {
    fontSize: 18,
    color: '#9CA3AF'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  }
});

export default MyNotesPage;
