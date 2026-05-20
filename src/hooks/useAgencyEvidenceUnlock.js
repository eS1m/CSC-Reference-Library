import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeEvidenceUnlock } from '../firebase/collections/evidenceUnlocks';

export function useAgencyEvidenceUnlock() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      unsub();

      if (!currentUser) {
        setIsUnlocked(false);
        setLoading(false);
        return;
      }

      unsub = subscribeEvidenceUnlock(
        currentUser.uid,
        (data) => {
          setIsUnlocked(!!data.unlocked);
          setLoading(false);
        },
        (err) => {
          console.error('Evidence unlock listener error:', err);
          setIsUnlocked(false);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsub();
    };
  }, []);

  return { isUnlocked, loading };
}
