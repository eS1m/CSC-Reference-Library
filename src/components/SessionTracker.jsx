import { useEffect, useRef } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { createSession, heartbeat, removeSession } from '../firebase/collections/activeSessions';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

async function safeRemoveSession(userId) {
  try {
    await removeSession(userId);
  } catch (err) {
    // Permission errors during logout are expected — the session will expire
    // naturally via the 2-minute heartbeat timeout anyway.
    if (err.code !== 'permission-denied') {
      console.error('Session cleanup error:', err);
    }
  }
}

export default function SessionTracker() {
  const intervalRef = useRef(null);
  const userIdRef = useRef(null);

  useEffect(() => {
    const cleanup = async () => {
      if (userIdRef.current && auth.currentUser) {
        await safeRemoveSession(userIdRef.current);
      }
    };

    const handleBeforeUnload = () => {
      if (userIdRef.current) {
        // Fire-and-forget — auth is still valid during beforeunload
        removeSession(userIdRef.current).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (userIdRef.current) {
        // Only attempt delete if still authenticated; otherwise let heartbeat expiry clean up
        if (auth.currentUser) {
          await safeRemoveSession(userIdRef.current);
        }
        userIdRef.current = null;
      }

      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? userDoc.data().role : null;

        if (role) {
          userIdRef.current = user.uid;
          await createSession(user.uid, user.email, role);
          intervalRef.current = setInterval(() => {
            heartbeat(user.uid);
          }, HEARTBEAT_INTERVAL);
        }
      } catch (err) {
        console.error('SessionTracker error:', err);
      }
    });

    return () => {
      unsubAuth();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cleanup();
    };
  }, []);

  return null;
}
