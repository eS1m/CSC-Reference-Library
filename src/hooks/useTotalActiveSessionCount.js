import { useState, useEffect } from 'react';
import { subscribeActiveSessions } from '../firebase/collections/activeSessions';

const SESSION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export function useTotalActiveSessionCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeActiveSessions(
      (snapshot) => {
        const now = Date.now();
        const activeCount = snapshot.docs.filter((d) => {
          const data = d.data();
          const hb = data.lastHeartbeat?.toMillis?.() || 0;
          return now - hb < SESSION_TIMEOUT_MS;
        }).length;
        setCount(activeCount);
      },
      (err) => {
        console.error('Active sessions listener error:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  return count;
}
