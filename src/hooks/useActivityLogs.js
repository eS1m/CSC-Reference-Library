import { useState, useEffect } from 'react';
import { subscribeActivityLogs } from '../firebase/collections/activityLogs';

export function useActivityLogs() {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = subscribeActivityLogs({}, (logs) => {
      setActivityLogs(logs);
      setLoading(false);
    }, (err) => {
      console.error('Activity logs listener error:', err);
      setError('Failed to load activity logs');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { activityLogs, loading, error };
}
