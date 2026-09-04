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
  // Return targets so back goes where the user came from, not always the dashboard
  const [assignmentReturn, setAssignmentReturn] = useState('dashboard');
  const [examReturn, setExamReturn] = useState('dashboard');
  const [createReturn, setCreateReturn] = useState('dashboard');

  const goDashboard = () => {
    setCurrentScreen('dashboard');
    setSelectedAssignment(null);
    setSelectedExam(null);
    setAssignmentReturn('dashboard');
    setExamReturn('dashboard');
    setCreateReturn('dashboard');
  };

  const handleNavigate = (screen, params = {}) => {
    if (screen === 'AssignmentList') {
      setCurrentScreen('AssignmentList');
      setSelectedAssignment(null);
    } else if (screen === 'AssignmentDetail') {
      setSelectedAssignment(params.assignment);
      setAssignmentReturn(params.from === 'list' ? 'list' : 'dashboard');
      setCurrentScreen('AssignmentDetail');
    } else if (screen === 'CreateAssignment') {
      if (params.assignment) {
        // Edit mode launched from a detail screen
        setSelectedAssignment(params.assignment);
        setCreateReturn('detail');
      } else {
        setCreateReturn('dashboard');
      }
      setCurrentScreen('CreateAssignment');
    } else if (screen === 'GradeSubmission') {
      setSelectedAssignment(params.assignment);
      setCurrentScreen('GradeSubmission');
    } else if (screen === 'ExamList') {
      setCurrentScreen('ExamList');
      setSelectedExam(null);
    } else if (screen === 'ExamDetail') {
      setSelectedExam(params.exam);
      setExamReturn(params.from === 'list' ? 'list' : 'dashboard');
      setCurrentScreen('ExamDetail');
    } else if (screen === 'CreateExam') {
      setCurrentScreen('CreateExam');
    } else if (screen === 'ExportGrades') {
      setCurrentScreen('ExportGrades');
    } else if (screen === 'dashboard') {
      goDashboard();
    }
  };

  const goBackFrom = (screen) => {
    if (screen === 'AssignmentDetail') {
      handleNavigate(assignmentReturn === 'list' ? 'AssignmentList' : 'dashboard');
    } else if (screen === 'CreateAssignment') {
      if (createReturn === 'detail' && selectedAssignment) {
        handleNavigate('AssignmentDetail', { assignment: selectedAssignment, from: 'detail' });
      } else {
        goDashboard();
      }
    } else if (screen === 'ExamDetail') {
      handleNavigate(examReturn === 'list' ? 'ExamList' : 'dashboard');
    } else {
      goDashboard();
    }
  };

  const subNavigation = {
    goBack: goDashboard,
    navigate: handleNavigate,
  };

  if (currentScreen === 'AssignmentList') {
    return <AssignmentList route={{ params: {} }} navigation={subNavigation} />;
  }

  if (currentScreen === 'AssignmentDetail') {
    return (
      <AssignmentDetail
        route={{ params: { assignment: selectedAssignment } }}
        navigation={{ goBack: () => goBackFrom('AssignmentDetail'), navigate: handleNavigate }}
      />
    );
  }

  if (currentScreen === 'CreateAssignment') {
    return (
      <CreateAssignment
        route={{ params: { assignment: selectedAssignment } }}
        navigation={{ goBack: () => goBackFrom('CreateAssignment'), navigate: handleNavigate }}
      />
    );
  }

  if (currentScreen === 'GradeSubmission') {
    return (
      <GradeSubmission
        route={{ params: { assignment: selectedAssignment } }}
        navigation={{
          goBack: () => handleNavigate('AssignmentDetail', { assignment: selectedAssignment, from: 'detail' }),
          navigate: handleNavigate,
        }}
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
        navigation={{ goBack: () => goBackFrom('ExamDetail'), navigate: handleNavigate }}
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

  const handleStatPress = (statId) => {
    if (statId === 'active' || statId === 'due') {
      handleNavigate('AssignmentList');
    } else if (statId === 'grading') {
      const target = ACTIVE_ASSIGNMENTS.find((item) => item.graded < item.submitted) || ACTIVE_ASSIGNMENTS[0];
      handleNavigate('AssignmentDetail', { assignment: target, from: 'dashboard' });
    } else if (statId === 'exams') {
      handleNavigate('ExamList');
    }
  };

  const handleAlertPress = (alert) => {
    if (alert.id === 'alert1') {
      const target = ACTIVE_ASSIGNMENTS.find((item) => item.id === 'lab01') || ACTIVE_ASSIGNMENTS[0];
      handleNavigate('AssignmentDetail', { assignment: target, from: 'dashboard' });
    } else if (alert.id === 'alert2') {
      handleNavigate('AssignmentList');
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

        <StatsHero stats={STATS} onPressStat={handleStatPress} />

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
              onPress={() => handleNavigate('AssignmentDetail', { assignment, from: 'dashboard' })}
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
              onPress={() => handleNavigate('ExamDetail', { exam, from: 'dashboard' })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <QuickActions actions={QUICK_ACTIONS} onActionPress={handleQuickAction} />
          <PriorityAlerts alerts={ALERTS} onPressAlert={handleAlertPress} />
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