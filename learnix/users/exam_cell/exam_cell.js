import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import components
import ExamCellHeader from './components/ExamCellHeader';
import ExamCellBottomNavbar from './components/ExamCellBottomNavbar';

// Import pages (bottom nav tabs)
import ExamDashboard from './pages/dashboard/dashboard';
import TimetableModule from './pages/timetable/timetable';
import EvaluationsModule from './pages/evaluations/evaluations';
import ResultsModule from './pages/results/results';
import ExamProfile from './pages/profile/profile';

// Import feature modules (opened from dashboard hub)
import HallTicketsModule from './pages/hall_tickets/hall_tickets';
import CheatingCasesModule from './pages/cheating_cases/cheating_cases';
import NotificationsScreen from './pages/notifications/notifications';

// X-08 cheating cases: the hub plus its four block sub-screens, reached through
// the dashboard. The hub is `./pages/cheating_cases/cheating_cases`; these are its
// blocks, and each `route` in `cheating_casesMeta.js` names one of them.
//
// Registering them HERE is load-bearing and its failure is SILENT, exactly as
// for the timetable and hall-ticket sets: `renderContent` looks the key up in
// FEATURE_MODULES, finds nothing, falls through to the tab switcher and puts the
// controller back on the hub with no error anywhere.
// `audit-cheating-ui.ts` asserts all five are present and point at their own
// component.
import CheatingCasesQueue from './pages/cheating_cases/pages/queue/queue';
import CheatingCasesReport from './pages/cheating_cases/pages/report/report';
import CheatingCasesCommittee from './pages/cheating_cases/pages/committee/committee';
import CheatingCasesHistory from './pages/cheating_cases/pages/history/history';
import CheatingCasesDetail from './pages/cheating_cases/pages/detail/detail';

// X-02 Timetable sub-screens (docs/users/05 §3.9). The hub is
// `./pages/timetable/timetable`, reached through the Timetable tab; these eight
// are its blocks, and each `route` in `timetable.rules.ts` names one of them.
//
// Registering them HERE is load-bearing and its failure is silent. `renderContent`
// looks the key up in FEATURE_MODULES, finds nothing, falls through to the tab
// switcher and puts the controller back on the hub with no error anywhere.
// `audit-timetable-ui.ts` asserts all eight are present and point at their own
// component; `prove-timetable-teeth.sh` proves that assertion bites.
import TimetableCalendar from './pages/timetable/pages/calendar/calendar';
import TimetableExams from './pages/timetable/pages/exams/exams';
import TimetableAllocation from './pages/timetable/pages/allocation/allocation';
import TimetableSlots from './pages/timetable/pages/slots/slots';
import TimetableRooms from './pages/timetable/pages/rooms/rooms';
import TimetableDuty from './pages/timetable/pages/duty/duty';
import TimetableStudents from './pages/timetable/pages/students/students';
import TimetableConflicts from './pages/timetable/pages/conflicts/conflicts';

// X-04 Hall tickets sub-screens (docs/users/05 §3.5). The hub is
// `./pages/hall_tickets/hall_tickets`, reached through the dashboard; these
// seven are its blocks, and each `route` in `hallTicketMeta.js` names one of
// them.
//
// Registering them HERE is load-bearing and its failure is silent, exactly as
// for the timetable eight: `renderContent` looks the key up in FEATURE_MODULES,
// finds nothing, falls through to the tab switcher and puts the controller
// back on the hub with no error anywhere. `audit-hallticket-ui.ts` asserts all
// seven are present and point at their own component.
import HallTicketsEligibility from './pages/hall_tickets/pages/eligibility/eligibility';
import HallTicketsGeneration from './pages/hall_tickets/pages/generation/generation';
import HallTicketsList from './pages/hall_tickets/pages/tickets/tickets';
import HallTicketsSchedule from './pages/hall_tickets/pages/schedule/schedule';
import HallTicketsCentre from './pages/hall_tickets/pages/centre/centre';
import HallTicketsRequests from './pages/hall_tickets/pages/requests/requests';
import HallTicketsPublication from './pages/hall_tickets/pages/publication/publication';

// X-05 evaluations: the hub plus its nine block sub-screens, reached through
// the Evaluations tab. Same contract as the timetable and hall-ticket sets:
// each `route` in `evaluationMeta.BLOCKS` must have a key here, and a missing
// key fails SILENTLY — `renderContent` finds nothing and drops the controller
// back on the hub with no error. `audit-evaluations-ui.ts` asserts every block
// route has a registry entry.
import EvaluationsProgress from './pages/evaluations/pages/progress/progress';
import EvaluationsScripts from './pages/evaluations/pages/scripts/scripts';
import EvaluationsAllocation from './pages/evaluations/pages/allocation/allocation';
import EvaluationsSubjects from './pages/evaluations/pages/subjects/subjects';
import EvaluationsMarks from './pages/evaluations/pages/marks/marks';
import EvaluationsDeadlines from './pages/evaluations/pages/deadlines/deadlines';
import EvaluationsMissing from './pages/evaluations/pages/missing/missing';
import EvaluationsModeration from './pages/evaluations/pages/moderation/moderation';
import EvaluationsRevaluation from './pages/evaluations/pages/revaluation/revaluation';

// X-06 results: the hub plus its eleven block sub-screens, reached through
// the Results tab. Same contract as the timetable, hall-ticket and evaluation
// sets: each `route` in `resultsMeta.BLOCKS` must have a key here, and a
// missing key fails SILENTLY — `renderContent` finds nothing and drops the
// controller back on the hub with no error. `audit-results-ui.ts` asserts
// every block route has a registry entry.
import ResultsConsolidate from './pages/results/pages/consolidate/consolidate';
import ResultsGrades from './pages/results/pages/grades/grades';
import ResultsCgpa from './pages/results/pages/cgpa/cgpa';
import ResultsPassFail from './pages/results/pages/passfail/passfail';
import ResultsVerify from './pages/results/pages/verify/verify';
import ResultsApproval from './pages/results/pages/approval/approval';
import ResultsPublish from './pages/results/pages/publish/publish';
import ResultsMarksheet from './pages/results/pages/marksheet/marksheet';
import ResultsRevaluation from './pages/results/pages/revaluation/revaluation';
import ResultsAnalytics from './pages/results/pages/analytics/analytics';
import ResultsExport from './pages/results/pages/export/export';

// X-10 profile sub-screens (docs/users/05 §3.8). The hub is `./pages/profile/profile`, reached
// through the Profile tab; these four are the rows it opens.
//
// Registering them HERE is load-bearing and its failure is SILENT, exactly as for the timetable,
// hall-ticket, evaluation, result and cheating sets: `renderContent` looks the key up in
// FEATURE_MODULES, finds nothing, falls through to the tab switcher and puts the officer back on
// the profile with no error anywhere. `audit-examcell-profile-ui.ts` asserts all four are present
// and point at their own component.
import ExamPermissions from './pages/profile/my_permissions/my_permissions';
import ExamActivity from './pages/profile/activity/activity';
import ExamChangePassword from './pages/profile/change_password/change_password';
import ExamHelpSupport from './pages/profile/help_support/help_support';

// X-11 the exam mark-roll. The invigilator takes the roll on a phone in a room, so the screen is a
// list of names with a PRESENT/ABSENT choice and ONE bulk submit.
//
// Its own FEATURE_MODULES entry rather than a ninth timetable block, because the timetable's eight
// blocks are a published contract that the docs and the UI audit both assert, and the timetable's
// job is the SCHEDULE — not the roll.
import ExamAttendanceScreen from './pages/attendance/attendance';

// Import theme
import { COLORS } from '../../constants/theme';
import { setDemoUser } from '../../services/api';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  HallTickets: { title: 'Hall Tickets', component: HallTicketsModule },
  CheatingCases: { title: 'Cheating Cases', component: CheatingCasesModule },
  CheatingCasesQueue: { title: 'Case queue', icon: 'albums-outline', component: CheatingCasesQueue },
  CheatingCasesReport: { title: 'Report malpractice', icon: 'create-outline', component: CheatingCasesReport },
  CheatingCasesCommittee: { title: 'Committee review', icon: 'people-outline', component: CheatingCasesCommittee },
  CheatingCasesHistory: { title: 'Historical records', icon: 'time-outline', component: CheatingCasesHistory },
  CheatingCasesDetail: { title: 'Case file', icon: 'document-text-outline', component: CheatingCasesDetail },
  Notifications: { title: 'Notifications', component: NotificationsScreen },
  ExamPermissions: { title: 'Access & Permissions', icon: 'shield-checkmark-outline', component: ExamPermissions },
  ExamActivity: { title: 'Sign-in history', icon: 'time-outline', component: ExamActivity },
  ExamChangePassword: { title: 'Change password', icon: 'lock-closed-outline', component: ExamChangePassword },
  ExamHelpSupport: { title: 'Help & Support', icon: 'help-circle-outline', component: ExamHelpSupport },
  ExamAttendance: { title: 'Mark the roll', icon: 'checkbox-outline', component: ExamAttendanceScreen },
  TimetableCalendar: { title: 'Examination Calendar', icon: 'calendar-outline', component: TimetableCalendar },
  TimetableExams: { title: 'Exam Schedules', icon: 'document-text-outline', component: TimetableExams },
  TimetableAllocation: { title: 'Course Allocation', icon: 'school-outline', component: TimetableAllocation },
  TimetableSlots: { title: 'Date & Time Slots', icon: 'time-outline', component: TimetableSlots },
  TimetableRooms: { title: 'Centres & Rooms', icon: 'business-outline', component: TimetableRooms },
  TimetableDuty: { title: 'Invigilator Duty', icon: 'people-outline', component: TimetableDuty },
  TimetableStudents: { title: 'Student Timetable', icon: 'person-outline', component: TimetableStudents },
  TimetableConflicts: { title: 'Clashes & Publishing', icon: 'warning-outline', component: TimetableConflicts },
  HallTicketsEligibility: { title: 'Student Eligibility', icon: 'checkbox-outline', component: HallTicketsEligibility },
  HallTicketsGeneration: { title: 'Generate Hall Tickets', icon: 'flash-outline', component: HallTicketsGeneration },
  HallTicketsList: { title: 'Tickets & Printing', icon: 'print-outline', component: HallTicketsList },
  HallTicketsSchedule: { title: 'Exam Subjects & Schedule', icon: 'time-outline', component: HallTicketsSchedule },
  HallTicketsCentre: { title: 'Examination Centre', icon: 'business-outline', component: HallTicketsCentre },
  HallTicketsRequests: { title: 'Corrections & Reissues', icon: 'swap-horizontal-outline', component: HallTicketsRequests },
  HallTicketsPublication: { title: 'Hall Ticket Publication', icon: 'megaphone-outline', component: HallTicketsPublication },
  EvaluationsProgress: { title: 'Evaluation Progress', icon: 'pie-chart-outline', component: EvaluationsProgress },
  EvaluationsScripts: { title: 'Answer Scripts', icon: 'document-text-outline', component: EvaluationsScripts },
  EvaluationsAllocation: { title: 'Evaluator Allocation', icon: 'people-outline', component: EvaluationsAllocation },
  EvaluationsSubjects: { title: 'Subject-wise Evaluation', icon: 'library-outline', component: EvaluationsSubjects },
  EvaluationsMarks: { title: 'Marks Entry', icon: 'create-outline', component: EvaluationsMarks },
  EvaluationsDeadlines: { title: 'Deadlines', icon: 'alarm-outline', component: EvaluationsDeadlines },
  EvaluationsMissing: { title: 'Missing Marks', icon: 'alert-circle-outline', component: EvaluationsMissing },
  EvaluationsModeration: { title: 'Moderation', icon: 'checkmark-done-outline', component: EvaluationsModeration },
  EvaluationsRevaluation: { title: 'Revaluation Requests', icon: 'refresh-circle-outline', component: EvaluationsRevaluation },
  ResultsConsolidate: { title: 'Marks Consolidation', icon: 'git-merge-outline', component: ResultsConsolidate },
  ResultsGrades: { title: 'Grade Calculation', icon: 'ribbon-outline', component: ResultsGrades },
  ResultsCgpa: { title: 'SGPA / CGPA', icon: 'calculator-outline', component: ResultsCgpa },
  ResultsPassFail: { title: 'Pass / Fail Processing', icon: 'account-check-outline', component: ResultsPassFail },
  ResultsVerify: { title: 'Result Verification', icon: 'checkmark-done-outline', component: ResultsVerify },
  ResultsApproval: { title: 'Result Approval', icon: 'checkbox-outline', component: ResultsApproval },
  ResultsPublish: { title: 'Result Publication', icon: 'megaphone-outline', component: ResultsPublish },
  ResultsMarksheet: { title: 'Marksheet', icon: 'document-text-outline', component: ResultsMarksheet },
  ResultsRevaluation: { title: 'Revaluation Updates', icon: 'refresh-circle-outline', component: ResultsRevaluation },
  ResultsAnalytics: { title: 'Result Analytics', icon: 'stats-chart-outline', component: ResultsAnalytics },
  ResultsExport: { title: 'Export Results', icon: 'download-outline', component: ResultsExport },
};

const TAB_TITLES = {
  Dashboard: 'Exam Dashboard',
  Timetable: 'Exam Timetable',
  Evaluations: 'Evaluations',
  Results: 'Results',
  Profile: 'My Profile',
};

export default function ExamCellScreen({ navigation }) {
  setDemoUser('examcell@learnix.dev');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  // The params for the current sub-screen. A sub-screen that opens ONE of something — the case
  // file, which shows a single case out of a list — cannot be reached without knowing which, and a
  // `navigate` that drops its second argument is a navigate that opens the screen on nothing.
  const [screenParams, setScreenParams] = useState({});
  const insets = useSafeAreaInsetsWithPadding();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen('main');
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
  };

  const getHeaderTitle = () => {
    if (currentScreen === 'main') return TAB_TITLES[activeTab];
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.title : 'Exam Cell';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Timetable': return 'calendar-outline';
        case 'Evaluations': return 'clipboard-outline';
        case 'Results': return 'trophy-outline';
        case 'Profile': return 'person-outline';
        default: return 'grid-outline';
      }
    }
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.icon || 'apps-outline' : 'apps-outline';
  };

  const renderContent = () => {
    // Feature module sub-screens
    if (currentScreen !== 'main') {
      const mod = FEATURE_MODULES[currentScreen];
      if (mod) {
        const ModuleComponent = mod.component;
        return (
          <ModuleComponent
            navigation={{
              // The PARAMS are carried, not just the screen name. A sub-screen that needs to know
              // WHICH case it is showing — the case file, which opens a single case out of a list —
              // cannot be reached without them, and a `navigate` that drops its second argument is a
              // navigate that opens the screen on nothing.
              navigate: (screen, params) => {
                setCurrentScreen(screen);
                setScreenParams(params ?? {});
              },
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
            route={{ params: screenParams }}
          />
        );
      }
    }

    // Main tabs
    switch (activeTab) {
      case 'Timetable':
        return (
          <TimetableModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
              // `switchTab` is what `goToRoute` uses for a block whose
              // published `isTab` is true. It was MISSING on this tab, so a
              // timetable block routed to a tab would have called
              // `undefined is not a function` — and because `goToRoute` checks
              // `TAB_ROUTES.includes(route)` first, that only ever happens for
              // a server change, which is exactly when nobody is watching.
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Evaluations':
        return (
          <EvaluationsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Results':
        return (
          <ResultsModule
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
            }}
          />
        );
      case 'Profile':
        // The profile opens FOUR sub-screens, so it needs a `navigate` that carries the screen
        // name AND the params — a `navigate` that drops its second argument is a navigate that
        // opens the screen on nothing. `goBack` returns to the profile, which is where the
        // officer came from.
        return (
          <ExamProfile
            navigation={{
              navigate: (screen, params) => {
                setCurrentScreen(screen);
                setScreenParams(params ?? {});
              },
              goBack: handleBackPress,
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
      case 'Dashboard':
      default:
        return (
          <ExamDashboard
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: () => setCurrentScreen('main'),
              openModule: (key) => setCurrentScreen(key),
              switchTab: (tabId) => handleTabChange(tabId),
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ExamCellHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <ExamCellBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    flex: 1,
  },
});