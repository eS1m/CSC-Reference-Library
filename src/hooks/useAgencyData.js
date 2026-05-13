
import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { validateAgency } from '../utils/validateAgency';

export const useAgencyData = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [employees, setEmployees] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const validateEmployees = useCallback((e) => {
        if (!e?.employeeData || Object.keys(e.employeeData).length === 0) return false;
        
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

                // 1. Profile Listener
                unsubProfile = onSnapshot(
                    doc(db, "agencyProfiles", currentUser.uid),
                    (snapshot) => {
                        setProfile(snapshot.data() || null);
                    },
                    (err) => {
                        console.error("Profile listener error:", err);
                        setError("Failed to load agency profile");
                    }
                );

                // 2. Employee Listener
                unsubEmployees = onSnapshot(
                    doc(db, "agencyEmployees", currentUser.uid),
                    (snapshot) => {
                        setEmployees(snapshot.data() || null);
                    },
                    (err) => {
                        console.error("Employee listener error:", err);
                        setError("Failed to load employee data");
                    }
                );

                // 3. Submissions Listener — ordered by upload date
                const q = query(
                    collection(db, "agencySubmissions"),
                    where("userId", "==", currentUser.uid),
                    orderBy("uploadedAt", "desc")
                );
                
                unsubSubmissions = onSnapshot(
                    q,
                    (snapshot) => {
                        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                        setSubmissions(data);
                        setLoading(false);
                    },
                    (err) => {
                        console.error("Submissions listener error:", err);
                        setSubmissions([]);
                        setLoading(false);
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
        const assistPlan = submissions.find(s => s.fileType === "Assist-Plan");

        let step = 1;
        if (isAgencyDone) step = 2;
        if (isAgencyDone && isEmployeeDone) step = 3;
        if (selfAssessment?.status === "Pending") step = 4;
        else if (selfAssessment?.status === "Approved") step = 5;
        if (assistPlan?.status === "Pending") step = 6;

        return {
            currentStep: step,
            isLocked: step !== 3 && step !== 5,
            isAgencyDone,
            isEmployeeDone,
            hasSelfAssessment: !!selfAssessment,
            hasAssistPlan: !!assistPlan,
            selfAssessmentStatus: selfAssessment?.status || null,
            assistPlanStatus: assistPlan?.status || null,
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
        hasAssistPlan: derived.hasAssistPlan,
        selfAssessmentStatus: derived.selfAssessmentStatus,
        assistPlanStatus: derived.assistPlanStatus,
    };
};