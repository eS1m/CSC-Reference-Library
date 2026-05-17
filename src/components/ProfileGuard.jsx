import { Navigate, useLocation } from 'react-router-dom';
import { useAgencyData } from '../hooks/useAgencyData';

const ProfileGuard = ({ children }) => {
    const location = useLocation();
    const { currentStep, hasSelfAssessment, isAgencyDone, isEmployeeDone, loading } = useAgencyData();

    if (loading) return <div className="loading-screen">Verifying Access...</div>;

    if (location.pathname === '/upload-u' && currentStep < 3) {
        return <Navigate to="/dashboard-u" replace />;
    }

    if (location.pathname === '/action-plan-u' && (!isAgencyDone || !isEmployeeDone || !hasSelfAssessment)) {
        return <Navigate to="/dashboard-u" replace />;
    }

    const allowed = ['/dashboard-u', '/profile-u', '/employee-u'];
    if (currentStep < 3 && !allowed.includes(location.pathname)) {
        return <Navigate to="/dashboard-u" replace />;
    }

    return children;
};

export default ProfileGuard;