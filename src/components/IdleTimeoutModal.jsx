import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../firebase/config';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';

// Production defaults: 9 min warning, 1 min grace
const DEFAULT_WARNING_MS = 9 * 60 * 1000;
const DEFAULT_LOGOUT_MS = 60 * 1000;

// Dev override via Vite env vars (e.g., VITE_IDLE_WARNING_MS=5000)
const WARNING_DELAY = Number(import.meta.env.VITE_IDLE_WARNING_MS) || DEFAULT_WARNING_MS;
const LOGOUT_DELAY = Number(import.meta.env.VITE_IDLE_LOGOUT_MS) || DEFAULT_LOGOUT_MS;

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export default function IdleTimeoutModal() {
  const [user, setUser] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showLoggedOut, setShowLoggedOut] = useState(false);
  const nav = useNavigate();

  const warningTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const showWarningRef = useRef(false);

  // Keep ref in sync so activity listener always sees current state
  showWarningRef.current = showWarning;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const performLogout = useCallback(async () => {
    clearTimers();
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Auto-logout error:', err);
    }
  }, [clearTimers]);

  const startTimers = useCallback(() => {
    clearTimers();
    if (!user) return;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      logoutTimerRef.current = setTimeout(() => {
        setShowWarning(false);
        setShowLoggedOut(true);
        performLogout();
      }, LOGOUT_DELAY);
    }, WARNING_DELAY);
  }, [user, clearTimers, performLogout]);

  // Watch auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setShowLoggedOut(false); // Reset when a new user logs in
      }
      if (!u) {
        setShowWarning(false);
        clearTimers();
      }
    });
    return () => unsub();
  }, [clearTimers]);

  // Attach activity listeners and manage timers
  useEffect(() => {
    if (!user) {
      clearTimers();
      return;
    }

    const handleActivity = () => {
      // If warning is showing, dismiss it on any activity
      if (showWarningRef.current) {
        setShowWarning(false);
      }
      startTimers();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity));
    startTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
      clearTimers();
    };
  }, [user, startTimers, clearTimers]);

  const handleExtend = () => {
    setShowWarning(false);
    startTimers();
  };

  const handleAcknowledgeLogout = () => {
    setShowLoggedOut(false);
    nav('/');
  };

  // Show logged-out modal even if auth has already cleared
  if (!user && !showLoggedOut) return null;

  return (
    <>
      {/* Warning Modal */}
      <Modal
        isOpen={showWarning}
        onClose={() => {}}
        title="Session Timeout Warning"
        variant="warning"
        size="sm"
        hideCloseButton={true}
        disableOverlayClose={true}
        actions={
          <button
            className="modal-btn modal-btn-primary modal-btn-full"
            onClick={handleExtend}
          >
            Extend Session
          </button>
        }
      >
        <p style={{ fontWeight: 600 }}>You will be logged out soon</p>
        <p className="modal-subtext">
          You have been idle for {Math.round(WARNING_DELAY / 60000)} minutes. You will be automatically logged out in {Math.round(LOGOUT_DELAY / 60000) || '< 1'} minute(s) unless you extend your session.
        </p>
      </Modal>

      {/* Logged Out Modal */}
      <Modal
        isOpen={showLoggedOut}
        onClose={() => {}}
        title="Session Expired"
        variant="info"
        size="sm"
        hideCloseButton={true}
        disableOverlayClose={true}
        actions={
          <button
            className="modal-btn modal-btn-primary modal-btn-full"
            onClick={handleAcknowledgeLogout}
          >
            OK
          </button>
        }
      >
        <p style={{ fontWeight: 600 }}>You have been logged out</p>
        <p className="modal-subtext">
          You were idle for too long and have been automatically logged out for security reasons. Please log in again to continue.
        </p>
      </Modal>
    </>
  );
}
