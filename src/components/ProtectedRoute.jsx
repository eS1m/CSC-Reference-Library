import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
// Import your custom instances
import { auth, db } from '../firebase/config'; 
// Import functions from the actual Firebase library
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          // Fetch role from Firestore
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setRole(userSnap.data().role);
          } else {
            setRole("u"); // Fallback if no doc exists yet
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <h3>Verifying Access...</h3>
      </div>
    );
  }

  // If not logged in, boot to login page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If they have the wrong role, redirect or show error
  if (requiredRole && role !== requiredRole) {
    // Optional: Redirect them to their proper dashboard instead of just showing a message
    return <Navigate to={role === "admin" ? "/xu-dash" : "/dashboard-u"} replace />;
  }

  return children;
};

export default ProtectedRoute;