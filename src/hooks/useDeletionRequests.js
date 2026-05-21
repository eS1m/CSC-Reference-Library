import { useState, useEffect } from 'react';
import { subscribeDeletionRequests } from '../firebase/collections/deletionRequests';

export function useDeletionRequests(options = {}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { status, userId } = options;

  useEffect(() => {
    const unsub = subscribeDeletionRequests({ status, userId }, (data) => {
      const sorted = [...data].sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      setRequests(sorted);
      setLoading(false);
    }, (err) => {
      console.error('Deletion requests listener error:', err);
      setError('Failed to load deletion requests');
      setLoading(false);
    });
    return () => unsub();
  }, [status, userId]);

  return { requests, loading, error };
}
