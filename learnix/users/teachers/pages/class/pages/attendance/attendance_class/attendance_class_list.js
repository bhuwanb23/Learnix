import React from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Text,
  ActivityIndicator 
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../../../../../../constants/theme';
import AttendanceHeader from './components/AttendanceHeader';
import SearchBar from './components/SearchBar';
import ClassCard from './components/ClassCard';
import { useAttendanceClass } from './hooks/useAttendanceClass';

export default function AttendanceClassList() {
  const {
    classes,
    stats,
    loading,
    refreshing,
    searchQuery,
    onRefresh,
    handleClassPress,
    handleMarkAttendance,
    handleViewReports,
    handleSearch,
    clearSearch
  } = useAttendanceClass();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      >
        <AttendanceHeader 
          stats={stats}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
        
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          onClear={clearSearch}
          placeholder="Search classes by name, subject, or code..."
        />

        {classes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No Classes Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search terms' : 'No classes available at the moment'}
            </Text>
          </View>
        ) : (
          <View style={styles.classesContainer}>
            {classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onPress={handleClassPress}
                onMarkAttendance={handleMarkAttendance}
                onViewReports={handleViewReports}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC' // Light blue background
  },
  scrollView: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textSecondary
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4xl'],
    paddingHorizontal: SPACING.lg
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24
  },
  classesContainer: {
    paddingBottom: SPACING.xl
  }
});
