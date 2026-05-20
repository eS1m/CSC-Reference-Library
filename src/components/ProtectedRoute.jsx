import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase/config'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Modal from '../components/Modal';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNoRoleModal, setShowNoRoleModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!currentUser) {
        if (isMounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
          setError(null);
          setShowNoRoleModal(false);
        }
        return;
      }

      let retries = 0;
      const MAX_RETRIES = 3;
      const DELAY = 1000;

      const attemptFetch = async () => {
        try {
          if (!isMounted) return;
          setUser(currentUser);

          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (!isMounted) return;

          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.role) {
              setRole(userData.role);
              setShowNoRoleModal(false);
            } else {
              setRole(null);
              setShowNoRoleModal(true);
            }
          } else {
            setRole("u");
            setShowNoRoleModal(false);
          }

          setError(null);
          setLoading(false);
        } catch (err) {
          console.error("Error fetching user role:", err);
          if (!isMounted) return;

          if (retries < MAX_RETRIES) {
            retries++;
            timeoutId = setTimeout(attemptFetch, DELAY);
          } else {
            setError(err.message || "Failed to verify access");
            setLoading(false);
          }
        }
      };

      attemptFetch();
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <h3>Verifying Access...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px', gap: '12px' }}>
        <h3 style={{ color: '#cc0000' }}>Unable to Verify Access</h3>
        <p style={{ color: '#666', maxWidth: '400px', textAlign: 'center' }}>{error}</p>
      </div>
    );
  }

  if (showNoRoleModal) {
    return (
      <Modal
        isOpen={showNoRoleModal}
        onClose={async () => {
          await signOut(auth);
          setShowNoRoleModal(false);
        }}
        title="Access Error"
        variant="warning"
        actions={
          <button
            className="modal-btn modal-btn-primary modal-btn-full"
            onClick={async () => {
              await signOut(auth);
              setShowNoRoleModal(false);
            }}
          >
            OK
          </button>
        }
      >
        <p style={{ fontWeight: 600 }}>No Role Assigned</p>
        <p className="modal-subtext">This account currently has no role attached, please contact an administrator.</p>
      </Modal>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    switch (role) {
      case "admin":
        return <Navigate to="/dashboard-a" replace />;
      case "p":
        return <Navigate to="/dashboard-p" replace />;
      case "u":
        return <Navigate to="/dashboard-u" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;