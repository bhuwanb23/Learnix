import { useMemo, useState, useCallback } from 'react';
import {
  OVERVIEW_CARDS,
  QUICK_ACTIONS,
  UPLOAD_RESULT,
  PERFORMANCE_SERIES,
  PERFORMANCE_LABELS,
  DEADLINE_SERIES,
  DEADLINE_LABELS,
  RECENT_ACTIVITY,
} from '../constants/data';

export function useAssignmentExams() {
  const [refreshing, setRefreshing] = useState(false);

  const overview = useMemo(() => OVERVIEW_CARDS, []);
  const actions = useMemo(() => QUICK_ACTIONS, []);
  const upload = useMemo(() => UPLOAD_RESULT, []);
  const performance = useMemo(() => ({ series: PERFORMANCE_SERIES, labels: PERFORMANCE_LABELS }), []);
  const deadlines = useMemo(() => ({ series: DEADLINE_SERIES, labels: DEADLINE_LABELS }), []);
  const activity = useMemo(() => RECENT_ACTIVITY, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const onActionPress = useCallback((id) => {
    // integrate navigation/handlers
  }, []);

  return {
    overview,
    actions,
    upload,
    performance,
    deadlines,
    activity,
    refreshing,
    onRefresh,
    onActionPress,
  };
}


