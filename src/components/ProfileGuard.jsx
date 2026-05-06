import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const ProfileGuard = ({ children }) => {
  const [status, setStatus] = useState({ loading: true, allowed: false });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profileSnap = await getDoc(doc(db, "agencyProfiles", user.uid));
          const employeeSnap = await getDoc(doc(db, "agencyEmployees", user.uid));

          setStatus({ 
            loading: false, 
            allowed: profileSnap.exists() && employeeSnap.exists() 
          });
        } catch (error) {
          console.error("Guard Error:", error);
          setStatus({ loading: false, allowed: false });
        }
      } else {
        setStatus({ loading: false, allowed: false });
      }
    });

    return () => unsubscribe();
  }, []);

  if (status.loading) {
    return <div className="loading-screen">Verifying Profile Status...</div>;
  }

  if (!status.allowed) {
    alert("Access Denied: Please complete your Agency and Employee profiles first.");
    return <Navigate to="/dashboard-u" replace />;
  }

  return children;
};

export default ProfileGuard;