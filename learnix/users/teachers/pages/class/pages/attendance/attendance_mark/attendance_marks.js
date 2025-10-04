import React, { useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Text
} from 'react-native';
import { useAttendanceMarks } from './hooks/useAttendanceMarks';
import AttendanceHeader from './components/AttendanceHeader';
import ProgressBar from './components/ProgressBar';
import QuickActions from './components/QuickActions';
import FraudAlert from './components/FraudAlert';
import NavigationTabs from './components/NavigationTabs';
import SummaryCards from './components/SummaryCards';
import StudentList from './components/StudentList';
import BottomActionBar from './components/BottomActionBar';

export default function AttendanceMarks({ navigation }) {
  const {
    // Data
    students,
    classInfo,
    activeTab,
    loading,
    saving,
    showFraudAlert,
    stats,
    progressPercentage,
    tabs,
    quickActions,
    fraudAlert,
    
    // Actions
    loadStudents,
    saveAttendance,
    handleTabChange,
    handleStudentStatusChange,
    handleQuickAction,
    handleBack,
    handleMenuPress,
    handleDismissFraudAlert
  } = useAttendanceMarks();

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleRefresh = () => {
    loadStudents();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <AttendanceHeader
        classInfo={classInfo}
        onBackPress={() => handleBack(navigation)}
        onMenuPress={handleMenuPress}
      />

      {/* Progress Bar */}
      <ProgressBar
        presentCount={stats?.presentCount || 0}
        totalCount={stats?.totalStudents || 0}
        percentage={progressPercentage}
      />

      {/* Quick Actions */}
      <QuickActions
        actions={quickActions}
        onActionPress={handleQuickAction}
      />

      {/* Fraud Alert */}
      <FraudAlert
        alert={fraudAlert}
        visible={showFraudAlert}
        onDismiss={handleDismissFraudAlert}
      />

      {/* Navigation Tabs */}
      <NavigationTabs
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
            refreshing={loading} 
            onRefresh={handleRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <SummaryCards
          presentCount={stats?.presentCount || 0}
          absentCount={stats?.absentCount || 0}
        />

        {/* Student List */}
        <StudentList
          students={students}
          onStudentStatusChange={handleStudentStatusChange}
        />
      </ScrollView>

      {/* Bottom Action Bar */}
      <BottomActionBar
        onSave={saveAttendance}
        saving={saving}
      />
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
    paddingBottom: 20
  }
});
