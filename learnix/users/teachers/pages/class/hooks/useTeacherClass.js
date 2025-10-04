import { useMemo, useCallback, useState } from 'react';
import { TIMETABLE, QUICK_ACTIONS, SYLLABUS, PENDING_TASKS, NAV_BUTTONS, RECENT_ACTIVITY } from '../constants/classData';

export function useTeacherClass() {
  const [refreshing, setRefreshing] = useState(false);

  const timetable = useMemo(() => TIMETABLE, []);
  const quickActions = useMemo(() => QUICK_ACTIONS, []);
  const syllabus = useMemo(() => SYLLABUS, []);
  const pendingTasks = useMemo(() => PENDING_TASKS, []);
  const navButtons = useMemo(() => NAV_BUTTONS, []);
  const recent = useMemo(() => RECENT_ACTIVITY, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleActionPress = useCallback((id) => {
    if (id === 'attendance') {
      // Navigate to attendance class list
      console.log('Navigate to attendance class list');
      // This will be handled by the parent component
    }
  }, []);

  const handleNavPress = useCallback((id) => {
    // stub: integrate navigation here
  }, []);

  return {
    timetable,
    quickActions,
    syllabus,
    pendingTasks,
    navButtons,
    recent,
    refreshing,
    onRefresh,
    handleActionPress,
    handleNavPress,
  };
}


