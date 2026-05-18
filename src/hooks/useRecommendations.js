import { useState, useEffect } from 'react';
import { subscribeRecommendations } from '../firebase/collections/recommendations';

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = subscribeRecommendations((data) => {
      setRecommendations(data);
      setLoading(false);
    }, (err) => {
      console.error('Recommendations listener error:', err);
      setError('Failed to load recommendations');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { recommendations, loading, error };
}
