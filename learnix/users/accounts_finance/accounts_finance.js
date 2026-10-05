import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Wire demo identity for this role app
import { setDemoUser } from '../../services/api';

// Import components
import AccountsHeader from './components/AccountsHeader';
import AccountsBottomNavbar from './components/AccountsBottomNavbar';

// Import pages (bottom nav tabs)
import AccountsDashboard from './pages/dashboard/dashboard';
import CollectionsModule from './pages/collections/collections';
import DuesModule from './pages/dues/dues';
import PayrollModule from './pages/payroll/payroll';
import AccountsProfile from './pages/profile/profile';

// Collections sub-pages (pages/collections/*)
import CollectPayment from './pages/collections/collect_payment/collect_payment';
import CollectionDetail from './pages/collections/collection_detail/collection_detail';
import StudentStatement from './pages/collections/student_statement/student_statement';

// Dues sub-pages (pages/dues/*)
import DueDetail from './pages/dues/due_detail/due_detail';
import StudentDues from './pages/dues/pages/student_dues/student_dues';
import CourseDues from './pages/dues/pages/course_dues/course_dues';
import PaymentPlans from './pages/dues/pages/payment_plan/payment_plan';
import LateFeePolicy from './pages/dues/pages/late_fee_policy/late_fee_policy';

// Payroll sub-pages (pages/payroll/*)
import PayrollDetail from './pages/payroll/pages/payroll_detail/payroll_detail';
import Payslip from './pages/payroll/pages/payslip/payslip';
// The salary desk (docs/users/06 §3.4): the records a payroll run is built FROM.
import PayrollSalaryRecords from './pages/payroll/pages/salary_records/salary_records';
import PayrollSalaryRecord from './pages/payroll/pages/salary_record/salary_record';
import PayrollComponents from './pages/payroll/pages/salary_components/salary_components';
import PayrollAttendance from './pages/payroll/pages/salary_attendance/salary_attendance';
import PayrollLoans from './pages/payroll/pages/salary_loans/salary_loans';
import PayrollAlerts from './pages/payroll/pages/payroll_alerts/payroll_alerts';
import PayslipDocument from './pages/payroll/pages/payslip_document/payslip_document';

// Import feature modules (opened from dashboard hub)
import FeeStructureModule from './pages/fee_structure/fee_structure';
import ExpensesModule from './pages/expenses/expenses';

// Fee structure sub-pages (docs/users/06 §3.5) — one per sub-feature, six deep,
// so every import path below is '../../../../../../services/api' from inside.
import FeeStructureDetail from './pages/fee_structure/pages/structure_detail/structure_detail';
import FeeStructureEditor from './pages/fee_structure/pages/component_editor/component_editor';
import FeeStructureVersions from './pages/fee_structure/pages/version_history/version_history';
import FeeStructureConcessions from './pages/fee_structure/pages/concessions/concessions';
import FeeStructureInstallments from './pages/fee_structure/pages/installments/installments';
import FeeStructurePenalties from './pages/fee_structure/pages/penalties/penalties';

// Expenses sub-pages (pages/expenses/pages/*)
import ExpenseEntry from './pages/expenses/pages/expense_entry/expense_entry';
import ExpenseDetail from './pages/expenses/pages/expense_detail/expense_detail';
import ExpenseBudgets from './pages/expenses/pages/budgets/budgets';
import Vendors from './pages/expenses/pages/vendors/vendors';
import DepartmentSpend from './pages/expenses/pages/department_spend/department_spend';
import ExpenseTrends from './pages/expenses/pages/trends/trends';
import ScholarshipsModule from './pages/scholarships/scholarships';
import ScholarshipApplications from './pages/scholarships/pages/applications/applications';
import ScholarshipApplication from './pages/scholarships/pages/application/application';
import ScholarshipDetail from './pages/scholarships/pages/detail/detail';
import ScholarshipDocuments from './pages/scholarships/pages/documents/documents';
import ScholarshipTracking from './pages/scholarships/pages/tracking/tracking';
import ScholarshipStudentHistory from './pages/scholarships/pages/student_history/student_history';
import ScholarshipApply from './pages/scholarships/pages/apply/apply';
import ReportsModule from './pages/reports/reports';
import NotificationsScreen from './pages/notifications/notifications';

// Import theme
import { COLORS } from '../../constants/theme';

// Import hooks
import useSafeAreaInsetsWithPadding from '../../hooks/useSafeAreaInsets';

// Feature module registry: key -> { title, component }
const FEATURE_MODULES = {
  FeeStructure: { title: 'Fee Structure', icon: 'pricetag-outline', component: FeeStructureModule },
  Expenses: { title: 'Expenses', icon: 'receipt-outline', component: ExpensesModule },
  Scholarships: { title: 'Scholarships', icon: 'ribbon-outline', component: ScholarshipsModule },
  Reports: { title: 'Reports & Analytics', icon: 'stats-chart-outline', component: ReportsModule },
  Notifications: { title: 'Notifications', icon: 'notifications-outline', component: NotificationsScreen },

  // Fee structure sub-pages (docs §3.5)
  FeeStructureDetail: { title: 'Fee Structure', icon: 'pricetag-outline', component: FeeStructureDetail },
  FeeStructureEditor: { title: 'Charge Lines', icon: 'create-outline', component: FeeStructureEditor },
  FeeStructureVersions: { title: 'Version History', icon: 'git-branch-outline', component: FeeStructureVersions },
  FeeStructureConcessions: { title: 'Concession Rules', icon: 'ribbon-outline', component: FeeStructureConcessions },
  FeeStructureInstallments: { title: 'Instalment Plan', icon: 'calendar-outline', component: FeeStructureInstallments },
  FeeStructurePenalties: { title: 'Late Fee on Fees', icon: 'shield-checkmark-outline', component: FeeStructurePenalties },

  // Scholarships sub-pages (docs §3.7)
  ScholarshipApplications: { title: 'Applications', icon: 'document-text-outline', component: ScholarshipApplications },
  ScholarshipApplication: { title: 'Application', icon: 'document-text-outline', component: ScholarshipApplication },
  ScholarshipDetail: { title: 'Scheme', icon: 'ribbon-outline', component: ScholarshipDetail },
  ScholarshipDocuments: { title: 'Document Desk', icon: 'folder-open-outline', component: ScholarshipDocuments },
  ScholarshipTracking: { title: 'Scholarship Amounts', icon: 'stats-chart-outline', component: ScholarshipTracking },
  ScholarshipStudentHistory: { title: 'Student Scholarships', icon: 'person-outline', component: ScholarshipStudentHistory },
  ScholarshipApply: { title: 'Record Application', icon: 'add-circle-outline', component: ScholarshipApply },

  // Collections sub-pages
  CollectPayment: { title: 'Collect Payment', icon: 'add-circle-outline', component: CollectPayment },
  CollectionDetail: { title: 'Collection Detail', icon: 'receipt-outline', component: CollectionDetail },
  StudentStatement: { title: 'Student Statement', icon: 'document-text-outline', component: StudentStatement },

  // Dues sub-pages
  DueDetail: { title: 'Fee Due', icon: 'receipt-outline', component: DueDetail },
  StudentDues: { title: 'Student Dues', icon: 'person-outline', component: StudentDues },
  CourseDues: { title: 'Course Dues', icon: 'school-outline', component: CourseDues },
  PaymentPlans: { title: 'Payment Plans', icon: 'git-branch-outline', component: PaymentPlans },
  LateFeePolicy: { title: 'Late Fee Policy', icon: 'pricetag-outline', component: LateFeePolicy },

  // Payroll sub-pages
  PayrollRunDetail: { title: 'Payroll Run', icon: 'card-outline', component: PayrollDetail },
  Payslip: { title: 'Payslip', icon: 'document-text-outline', component: Payslip },
  PayrollSalaryRecords: { title: 'Salary Records', icon: 'people-outline', component: PayrollSalaryRecords },
  PayrollSalaryRecord: { title: 'Salary Record', icon: 'person-outline', component: PayrollSalaryRecord },
  PayrollComponents: { title: 'Salary Structure', icon: 'options-outline', component: PayrollComponents },
  PayrollAttendance: { title: 'Attendance', icon: 'calendar-outline', component: PayrollAttendance },
  PayrollLoans: { title: 'Loans & Advances', icon: 'card-outline', component: PayrollLoans },
  PayrollAlerts: { title: 'Pending Salaries', icon: 'alert-circle-outline', component: PayrollAlerts },
  PayslipDocument: { title: 'Payslip Document', icon: 'document-text-outline', component: PayslipDocument },

  // Expenses sub-pages
  ExpenseEntry: { title: 'Raise a Claim', icon: 'add-circle-outline', component: ExpenseEntry },
  ExpenseDetail: { title: 'Expense Claim', icon: 'receipt-outline', component: ExpenseDetail },
  Budgets: { title: 'Budgets', icon: 'pie-chart-outline', component: ExpenseBudgets },
  Vendors: { title: 'Vendors', icon: 'storefront-outline', component: Vendors },
  DepartmentSpend: { title: 'Department Spend', icon: 'business-outline', component: DepartmentSpend },
  ExpenseTrends: { title: 'Expense Trends', icon: 'trending-up-outline', component: ExpenseTrends },
};

const TAB_TITLES = {
  Dashboard: 'Finance Dashboard',
  Collections: 'Collections',
  Dues: 'Dues & Recovery',
  Payroll: 'Payroll',
  Profile: 'My Profile',
};

export default function AccountsScreen({ navigation }) {
  setDemoUser('accounts@learnix.dev');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [currentScreen, setCurrentScreen] = useState('main');
  // Sub-pages need to know WHICH record they are showing. Without carrying
  // params, opening a collection detail would render an empty screen.
  const [routeParams, setRouteParams] = useState({});
  const insets = useSafeAreaInsetsWithPadding();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentScreen('main');
    setRouteParams({});
  };

  const handleBackPress = () => {
    setCurrentScreen('main');
    setRouteParams({});
  };

  const openModule = (key, params) => {
    setCurrentScreen(key);
    setRouteParams(params || {});
  };

  const getHeaderTitle = () => {
    if (currentScreen === 'main') return TAB_TITLES[activeTab];
    const mod = FEATURE_MODULES[currentScreen];
    return mod ? mod.title : 'Accounts & Finance';
  };

  const getHeaderIcon = () => {
    if (currentScreen === 'main') {
      switch (activeTab) {
        case 'Collections': return 'cash-outline';
        case 'Dues': return 'alert-circle-outline';
        case 'Payroll': return 'card-outline';
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
            route={{ params: routeParams }}
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
      }
    }

    // Main tabs
    switch (activeTab) {
      case 'Collections':
        return (
          <CollectionsModule
            route={{ params: routeParams }}
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
      case 'Dues':
        return (
          <DuesModule
            route={{ params: routeParams }}
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
            }}
          />
        );
      case 'Payroll':
        return (
          <PayrollModule
            route={{ params: routeParams }}
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
      case 'Profile':
        return <AccountsProfile navigation={{ goBack: handleBackPress, openModule }} />;
      case 'Dashboard':
      default:
        return (
          <AccountsDashboard
            navigation={{
              navigate: (screen) => setCurrentScreen(screen),
              goBack: handleBackPress,
              openModule,
              switchTab: handleTabChange,
            }}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <AccountsHeader
        title={getHeaderTitle()}
        icon={getHeaderIcon()}
        showBack={currentScreen !== 'main'}
        onBackPress={handleBackPress}
        onNotificationsPress={() => setCurrentScreen('Notifications')}
      />
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>
      <AccountsBottomNavbar activeTab={activeTab} onTabPress={handleTabChange} />
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