import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../../../services/api';

export default function useTeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.teacherApi.dashboard();
      // Merge profile name into header if available
      try {
        const profile = await api.teacherApi.profile();
        if (profile?.fullName) {
          result.header = { ...result.header, name: profile.fullName };
        }
      } catch { /* profile fetch optional */ }
      setData(result);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
