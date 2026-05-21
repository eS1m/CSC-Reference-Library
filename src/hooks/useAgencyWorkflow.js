import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeProfileById } from '../firebase/collections/agencyProfiles';
import { subscribeEmployeesById } from '../firebase/collections/agencyEmployees';
import { subscribeSubmissions } from '../firebase/collections/agencySubmissions';
import { validateAgency } from '../utils/validateAgency';

export const useAgencyWorkflow = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [employees, setEmployees] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const validateEmployees = useCallback((e) => {
        if (!e || typeof e !== 'object') return false;
        if (!e.employeeData || Object.keys(e.employeeData).length === 0) return false;
        
        const hrmFields = ['permanent', 'tempContractCasual', 'coterminusOthers'];
        const hasHrmSummary = e.hrmSummary && hrmFields.every(f => 
            typeof e.hrmSummary[f] === 'number' && !isNaN(e.hrmSummary[f])
        );
        
        const complementFields = ['firstLevel', 'secondLevelPT', 'secondLevelEM', 'thirdLevelPA'];
        const hasPersonnelComplement = e.personnelComplement && complementFields.every(f => 
            typeof e.personnelComplement[f] === 'number' && !isNaN(e.personnelComplement[f])
        );
        
        return hasHrmSummary && hasPersonnelComplement;
    }, []);

    useEffect(() => {
        let unsubProfile = () => {};
        let unsubEmployees = () => {};
        let unsubSubmissions = () => {};

        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            unsubProfile();
            unsubEmployees();
            unsubSubmissions();

            if (currentUser) {
                setUser(currentUser);
                setError(null);

                unsubProfile = subscribeProfileById(
                    currentUser.uid,
                    (data) => setProfile(data),
                    (err) => {
                        console.error("Profile listener error:", err);
                        setError("Failed to load agency profile");
                    }
                );

                unsubEmployees = subscribeEmployeesById(
                    currentUser.uid,
                    (data) => setEmployees(data),
                    (err) => {
                        console.error("Employee listener error:", err);
                        setError("Failed to load employee data");
                    }
                );

                unsubSubmissions = subscribeSubmissions(
                    { userId: currentUser.uid, orderByField: 'uploadedAt', orderDirection: 'desc' },
                    (data) => {
                        setSubmissions(data);
                        setLoading(false);
                        setError(prev => {
                            if (prev && prev.includes('submissions')) return null;
                            return prev;
                        });
                    },
                    (err) => {
                        console.error("Submissions listener error:", err);
                        setSubmissions([]);
                        setLoading(false);
                        let msg = 'Failed to load submissions.';
                        if (err.message?.includes('index')) {
                            msg += ' A required Firestore index may be missing. Please contact an administrator.';
                        }
                        setError(msg);
                    }
                );

            } else {
                setUser(null);
                setProfile(null);
                setEmployees(null);
                setSubmissions([]);
                setLoading(false);
            }
        });

        return () => {
            unsubAuth();
            unsubProfile();
            unsubEmployees();
            unsubSubmissions();
        };
    }, []);

    const derived = useMemo(() => {
        const isAgencyDone = validateAgency(profile);
        const isEmployeeDone = validateEmployees(employees);
        const selfAssessment = submissions.find(s => s.fileType === "Self-Assessment");
        const actionPlan = submissions.find(s => s.fileType === "Action-Plan");

        let step = 1;
        if (isAgencyDone) step = 2;
        if (isAgencyDone && isEmployeeDone) step = 3;
        if (selfAssessment) step = 4;
        if (actionPlan) step = 5;

        return {
            currentStep: step,
            isLocked: step < 3,
            isAgencyDone,
            isEmployeeDone,
            hasSelfAssessment: !!selfAssessment,
            hasActionPlan: !!actionPlan,
            agencyName: profile?.agencyDetails?.agencyName || "Agency User",
        };
    }, [profile, employees, submissions, validateEmployees]);

    return {
        user,
        profile,
        employees,
        submissions,
        loading,
        error,
        currentStep: derived.currentStep,
        isLocked: derived.isLocked,
        isAgencyDone: derived.isAgencyDone,
        isEmployeeDone: derived.isEmployeeDone,
        agencyName: derived.agencyName,
        hasSelfAssessment: derived.hasSelfAssessment,
        hasActionPlan: derived.hasActionPlan,
    };
};
