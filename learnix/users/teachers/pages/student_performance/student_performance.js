import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Image
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';
import { useStudentPerformance } from './hooks/useStudentPerformance';
import PerformanceHeader from './components/PerformanceHeader';
import SearchBar from './components/SearchBar';
import SummaryCard from './components/SummaryCard';
import WeakTopicsCard from './components/WeakTopicsCard';
import PerformanceChart from './components/PerformanceChart';
import QuickActionCard from './components/QuickActionCard';
import RecentActivityCard from './components/RecentActivityCard';

export default function StudentPerformance({ navigation }) {
  const {
    searchQuery,
    searchResults,
    isSearching,
    performanceData,
    handleSearch,
    handleQuickAction,
    refreshData
  } = useStudentPerformance();


  return (
    <SafeAreaView style={styles.container}>
      <PerformanceHeader 
        onNotificationPress={() => console.log('Notification pressed')}
      />
      
      <SearchBar 
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {searchResults.length > 0 && (
        <View style={styles.searchResults}>
          {searchResults.map((item) => (
            <TouchableOpacity key={item.id} style={styles.searchResultItem}>
              <Image source={{ uri: item.avatar }} style={styles.searchAvatar} />
              <View style={styles.searchContent}>
                <Text style={styles.searchName}>{item.name}</Text>
                <Text style={styles.searchClass}>{item.class}</Text>
                <View style={styles.searchStats}>
                  <Text style={styles.searchStat}>Attendance: {item.attendance}%</Text>
                  <Text style={styles.searchStat}>Avg: {item.averageScore}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshData} />
        }
      >
        {/* Student Engagement Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Engagement Summary</Text>
          
          <View style={styles.summaryGrid}>
            <SummaryCard 
              data={performanceData.summary.attendance} 
              color="blue"
            />
            <SummaryCard 
              data={performanceData.summary.examAverage} 
              color="indigo"
            />
          </View>
        </View>

        {/* Weak Topics */}
        <View style={styles.section}>
          <WeakTopicsCard topics={performanceData.weakTopics} />
        </View>

        {/* Performance Chart */}
        <View style={styles.section}>
          <PerformanceChart data={performanceData.chartData} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <View style={styles.quickActionsRow}>
              {performanceData.quickActions.slice(0, 2).map((item) => (
                <QuickActionCard 
                  key={item.id}
                  action={item} 
                  onPress={handleQuickAction}
                />
              ))}
            </View>
            <View style={styles.quickActionsRow}>
              {performanceData.quickActions.slice(2, 4).map((item) => (
                <QuickActionCard 
                  key={item.id}
                  action={item} 
                  onPress={handleQuickAction}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <RecentActivityCard activities={performanceData.recentActivity} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md
  },
  section: {
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  quickActionsGrid: {
    marginTop: SPACING.sm
  },
  quickActionsRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.sm
  },
  searchResults: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 200
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm
  },
  searchContent: {
    flex: 1
  },
  searchName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary
  },
  searchClass: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  searchStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs
  },
  searchStat: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary
  }
});
