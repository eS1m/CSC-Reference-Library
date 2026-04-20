import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';

const ProtectedRoute = ({ children, allowedDomain }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div>Loading permissions...</div>;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const hasAccess = user.email.endsWith(`@${allowedDomain}`);

  if (!hasAccess) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>403 - Access Denied</h1>
        <p>You do not have permission to view the {allowedDomain} dashboard.</p>
        <button onClick={() => auth.signOut()}>Sign Out</button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;