import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AssignmentHeader from './components/AssignmentHeader';
import StatsHero from './components/StatsHero';
import ActiveAssignmentCard from './components/ActiveAssignmentCard';
import UpcomingExamCard from './components/UpcomingExamCard';
import QuickActions from './components/QuickActions';
import PriorityAlerts from './components/PriorityAlerts';
import AssignmentList from './pages/assignments/assignment_list';
import AssignmentDetail from './pages/assignment_detail/assignment_detail';
import CreateAssignment from './pages/create_assignment/create_assignment';
import GradeSubmission from './pages/grade_submission/grade_submission';
import ExamList from './pages/exams/exam_list';
import ExamDetail from './pages/exam_detail/exam_detail';
import CreateExam from './pages/create_exam/create_exam';
import ExportGrades from './pages/export_grades/export_grades';
import { HEADER, STATS, ACTIVE_ASSIGNMENTS, UPCOMING_EXAMS, QUICK_ACTIONS, ALERTS } from './constants/data';

export default function AssignmentExamsPage({ navigation }) {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);

  const handleNavigate = (screen, params = {}) => {
    if (screen === 'AssignmentList') {
      setCurrentScreen('AssignmentList');
      setSelectedAssignment(null);
    } else if (screen === 'AssignmentDetail') {
      setSelectedAssignment(params.assignment);
      setCurrentScreen('AssignmentDetail');
    } else if (screen === 'CreateAssignment') {
      setCurrentScreen('CreateAssignment');
    } else if (screen === 'GradeSubmission') {
      setSelectedAssignment(params.assignment);
      setCurrentScreen('GradeSubmission');
    } else if (screen === 'ExamList') {
      setCurrentScreen('ExamList');
      setSelectedExam(null);
    } else if (screen === 'ExamDetail') {
      setSelectedExam(params.exam);
      setCurrentScreen('ExamDetail');
    } else if (screen === 'CreateExam') {
      setCurrentScreen('CreateExam');
    } else if (screen === 'ExportGrades') {
      setCurrentScreen('ExportGrades');
    } else if (screen === 'dashboard') {
      setCurrentScreen('dashboard');
      setSelectedAssignment(null);
      setSelectedExam(null);
    }
  };

  const subNavigation = {
    goBack: () => handleNavigate('dashboard'),
    navigate: handleNavigate,
  };

  if (currentScreen === 'AssignmentList') {
    return <AssignmentList route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'AssignmentDetail') {
    return (
      <AssignmentDetail
        route={{ params: { assignment: selectedAssignment } }}
        navigation={subNavigation}
      />
    );
  }

  if (currentScreen === 'CreateAssignment') {
    return <CreateAssignment route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'GradeSubmission') {
    return (
      <GradeSubmission
        route={{ params: { assignment: selectedAssignment } }}
        navigation={subNavigation}
      />
    );
  }

  if (currentScreen === 'ExamList') {
    return <ExamList route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'ExamDetail') {
    return (
      <ExamDetail
        route={{ params: { exam: selectedExam } }}
        navigation={subNavigation}
      />
    );
  }

  if (currentScreen === 'CreateExam') {
    return <CreateExam route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'ExportGrades') {
    return <ExportGrades route={{ params: {} }} navigation={subNavigation} />;
  }

  const handleQuickAction = (action) => {
    if (action.id === 'create') {
      handleNavigate('CreateAssignment');
    } else if (action.id === 'exam') {
      handleNavigate('CreateExam');
    } else if (action.id === 'export') {
      handleNavigate('ExportGrades');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AssignmentHeader
          header={HEADER}
          onAddPress={() => handleNavigate('CreateAssignment')}
        />

        <StatsHero stats={STATS} />

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Active Assignments</Text>
            <Text style={styles.seeAll} onPress={() => handleNavigate('AssignmentList')}>
              See all
            </Text>
          </View>
          {ACTIVE_ASSIGNMENTS.map((assignment) => (
            <ActiveAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onPress={() => handleNavigate('AssignmentDetail', { assignment })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Upcoming Exams</Text>
            <Text style={styles.seeAll} onPress={() => handleNavigate('ExamList')}>
              See all
            </Text>
          </View>
          {UPCOMING_EXAMS.map((exam) => (
            <UpcomingExamCard
              key={exam.id}
              exam={exam}
              onPress={() => handleNavigate('ExamDetail', { exam })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <QuickActions actions={QUICK_ACTIONS} onActionPress={handleQuickAction} />
          <PriorityAlerts alerts={ALERTS} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#2c2f31',
  },
  seeAll: {
    fontFamily: 'Manrope-Bold',
    fontSize: 12,
    fontWeight: '700',
    color: '#0050d4',
  },
});