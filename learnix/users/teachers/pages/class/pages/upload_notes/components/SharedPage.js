import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';

const SharedPage = ({ sharedNotes, onRefresh, refreshing, onNoteAction }) => {
  const renderSharedNoteItem = (note) => (
    <View key={note.id} style={styles.noteItem}>
      <View style={[styles.fileIcon, { backgroundColor: note.color + '20' }]}>
        <Text style={styles.fileIconText}>{note.icon}</Text>
      </View>
      
      <View style={styles.noteInfo}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {note.title}
        </Text>
        <View style={styles.authorContainer}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>{note.author.charAt(0)}</Text>
          </View>
          <Text style={styles.authorName}>{note.author}</Text>
          <Text style={styles.sharedTime}>{note.sharedTime}</Text>
        </View>
        <Text style={styles.noteSubject}>{note.subject}</Text>
        <Text style={styles.noteDetails}>
          {note.size} • {note.downloads} downloads
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
          <Text style={styles.searchPlaceholder}>Search shared notes...</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Section */}
      <View style={styles.featuredContainer}>
        <Text style={styles.sectionTitle}>Featured Notes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
          {sharedNotes.filter(note => note.featured).map((note) => (
            <View key={note.id} style={styles.featuredCard}>
              <View style={[styles.featuredIcon, { backgroundColor: note.color + '20' }]}>
                <Text style={styles.featuredIconText}>{note.icon}</Text>
              </View>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {note.title}
              </Text>
              <Text style={styles.featuredAuthor}>by {note.author}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Browse by Subject</Text>
        <View style={styles.categoriesGrid}>
          {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History'].map((subject) => (
            <TouchableOpacity key={subject} style={styles.categoryCard}>
              <Text style={styles.categoryIcon}>📚</Text>
              <Text style={styles.categoryName}>{subject}</Text>
              <Text style={styles.categoryCount}>12 notes</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Shared Notes */}
      <View style={styles.notesContainer}>
        <Text style={styles.sectionTitle}>Recently Shared</Text>
        {sharedNotes.length > 0 ? (
          sharedNotes.map(renderSharedNoteItem)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤝</Text>
            <Text style={styles.emptyTitle}>No shared notes</Text>
            <Text style={styles.emptySubtitle}>
              Notes shared with you will appear here
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
  featuredContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  featuredScroll: {
    marginHorizontal: -16
  },
  featuredCard: {
    width: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    alignItems: 'center'
  },
  featuredIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  featuredIconText: {
    fontSize: 18
  },
  featuredTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4
  },
  featuredAuthor: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center'
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  categoryCard: {
    width: '30%',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4
  },
  categoryCount: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center'
  },
  notesContainer: {
    paddingHorizontal: 16,
    marginTop: 8
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
    marginBottom: 6
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  authorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6
  },
  authorInitial: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  authorName: {
    fontSize: 12,
    color: '#374151',
    marginRight: 8
  },
  sharedTime: {
    fontSize: 10,
    color: '#9CA3AF'
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

export default SharedPage;
