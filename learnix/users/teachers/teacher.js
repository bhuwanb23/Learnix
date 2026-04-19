import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherHeader from './components/TeacherHeader';
import TeacherBottomNavbar from './components/TeacherBottomNavbar';
import TeacherDashboard from './pages/dashboard/dashboard';
import TeacherClassPage from './pages/class/class';
import AssignmentExamsPage from './pages/assignment_exams/assignment_exams';
import TeacherProfilePage from './pages/profile/profile';
import StudentPerformancePage from './pages/student_performance/student_performance';

export default function TeacherScreen() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <TeacherDashboard />;
      case 'Classes':
        return <TeacherClassPage navigation={{ navigate: (screen) => console.log('Navigate to:', screen) }} />;
      case 'Assignments':
        return <AssignmentExamsPage />;
      case 'Profile':
        return <TeacherProfilePage />;
      case 'Performance':
        return <StudentPerformancePage />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TeacherHeader />
      {renderContent()}
      <TeacherBottomNavbar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
};

