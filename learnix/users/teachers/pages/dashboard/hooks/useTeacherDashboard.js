import { useEffect, useState, useCallback } from 'react';
import { TEACHER_DASHBOARD_DATA } from '../constants/dashboardData';

export default function useTeacherDashboard() {
  const [data, setData] = useState(TEACHER_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      setData(TEACHER_DASHBOARD_DATA);
    } catch (e) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}


