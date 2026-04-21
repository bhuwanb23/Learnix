import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import TeacherHeader from './components/TeacherHeader';
import TeacherBottomNavbar from './components/TeacherBottomNavbar';
import TeacherDashboard from './pages/dashboard/dashboard';
import TeacherClassPage from './pages/class/class';
import ClassDashboard from './pages/class/pages/class_dashboard/class_dashboard';
import LectureNotes from './pages/class/pages/lecture_notes/lecture_notes';
import Quiz from './pages/class/pages/quiz/quiz';
import AssignmentExamsPage from './pages/assignment_exams/assignment_exams';
import TeacherProfilePage from './pages/profile/profile';
import StudentPerformancePage from './pages/student_performance/student_performance';

export default function TeacherScreen() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  const [selectedClass, setSelectedClass] = useState(null);

  const handleNavigate = (screen, params = {}) => {
    if (screen === 'ClassDashboard') {
      setCurrentScreen('ClassDashboard');
      setSelectedClass(params.classData);
    } else if (screen === 'LectureNotes') {
      setCurrentScreen('LectureNotes');
      setSelectedClass(params.classData);
    } else if (screen === 'Quiz') {
      setCurrentScreen('Quiz');
      setSelectedClass(params.classData);
    } else if (screen === 'main') {
      setCurrentScreen('main');
      setSelectedClass(null);
    }
  };

  const renderContent = () => {
    if (currentScreen === 'ClassDashboard') {
      return <ClassDashboard route={{ params: { classData: selectedClass } }} navigation={{ goBack: () => handleNavigate('main'), navigate: handleNavigate }} />;
    }

    if (currentScreen === 'Quiz') {
      return <Quiz route={{ params: { classData: selectedClass } }} navigation={{ goBack: () => handleNavigate('ClassDashboard'), navigate: handleNavigate }} />;
    }

    if (currentScreen === 'LectureNotes') {
      return <LectureNotes route={{ params: { classData: selectedClass } }} navigation={{ goBack: () => handleNavigate('ClassDashboard'), navigate: handleNavigate }} />;
    }

    switch (activeTab) {
      case 'Dashboard':
        return <TeacherDashboard />;
      case 'Classes':
        return <TeacherClassPage navigation={{ navigate: handleNavigate }} />;
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

