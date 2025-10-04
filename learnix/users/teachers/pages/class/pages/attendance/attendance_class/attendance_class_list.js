import React, { useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Text
} from 'react-native';
import { useAttendanceClass } from './hooks/useAttendanceClass';
import AttendanceHeader from './components/AttendanceHeader';
import TabNavigation from './components/TabNavigation';
import SummaryStats from './components/SummaryStats';
import ClassCard from './components/ClassCard';
import FloatingActionButton from './components/FloatingActionButton';

export default function AttendanceClassList({ navigation }) {
  const {
    classes,
    activeTab,
    searchQuery,
    loading,
    refreshing,
    stats,
    tabs,
    loadClasses,
    onRefresh,
    handleTabChange,
    handleSearch,
    handleClassPress,
    handleMarkAttendance,
    handleViewReports,
    handleAddClass,
    clearSearch
  } = useAttendanceClass();

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleBackPress = () => {
    console.log('Back pressed');
    if (navigation && navigation.navigate) {
      navigation.navigate('main'); // Go back to main (Classes tab)
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <AttendanceHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onClearSearch={clearSearch}
        onBackPress={handleBackPress}
      />

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabChange}
      />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
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
        {/* Summary Stats */}
        <SummaryStats stats={stats} />

        {/* Classes List */}
        <View style={styles.classesList}>
          {classes.length > 0 ? (
            classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onPress={handleClassPress}
                onMarkAttendance={handleMarkAttendance}
                onViewReports={handleViewReports}
                navigation={navigation}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No classes found matching your search.' : 'No classes available.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton onPress={handleAddClass} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100 // Space for floating action button
  },
  classesList: {
    paddingHorizontal: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24
  }
});
