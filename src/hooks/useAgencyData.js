
import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';

export const useAgencyData = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [employees, setEmployees] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const validateAgency = useCallback((p) => {
        if (!p) return false;
        const fields = ['agencyName', 'region', 'resolutionStatus', 'sector', 'status'];
        const agencyDone = fields.every(f => p.agencyDetails?.[f]?.toString().trim());
        const headDone = !!(p.headDetails?.name?.trim() && p.headDetails?.designation?.trim());
        const hrmDone = !!(p.hrmOfficers?.[0]?.name?.trim() && p.hrmOfficers?.[0]?.email?.trim());
        return agencyDone && headDone && hrmDone;
    }, []);

    const validateEmployees = useCallback((e) => {
        return !!(e?.employeeData && Object.keys(e.employeeData).length > 0);
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
    }, [profile, employees, submissions, validateAgency, validateEmployees]);

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