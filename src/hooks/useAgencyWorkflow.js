import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeProfileById } from '../firebase/collections/agencyProfiles';
import { subscribeEmployeesById } from '../firebase/collections/agencyEmployees';
import { subscribeSubmissions } from '../firebase/collections/agencySubmissions';
import { subscribeUserById } from '../firebase/collections/users';
import { validateAgency } from '../utils/validateAgency';

function getTimestampMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return isNaN(parsed) ? null : parsed;
}

function isUpdatedAfter(lastUpdated, assessmentStartedAt) {
  const updatedMs = getTimestampMillis(lastUpdated);
  const startedMs = getTimestampMillis(assessmentStartedAt);
  if (!startedMs) return true; // no assessment start = always valid
  if (!updatedMs) return false; // never updated after start = invalid
  return updatedMs > startedMs;
}

export const useAgencyWorkflow = () => {
    const [user, setUser] = useState(null);
    const [userDoc, setUserDoc] = useState(null);
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
        let unsubUserDoc = () => {};

        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            unsubProfile();
            unsubEmployees();
            unsubSubmissions();
            unsubUserDoc();

            if (currentUser) {
                setUser(currentUser);
                setError(null);

                unsubUserDoc = subscribeUserById(
                    currentUser.uid,
                    (data) => setUserDoc(data),
                    (err) => {
                        console.error("User doc listener error:", err);
                    }
                );

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
                setUserDoc(null);
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
            unsubUserDoc();
        };
    }, []);

    const derived = useMemo(() => {
        const assessmentStartedAt = userDoc?.assessmentStartedAt;
        const currentAssessmentYear = userDoc?.currentAssessmentYear || null;

        const agencyValid = validateAgency(profile);
        const employeeValid = validateEmployees(employees);

        const isAgencyDone = agencyValid && isUpdatedAfter(profile?.lastUpdated, assessmentStartedAt);
        const isEmployeeDone = employeeValid && isUpdatedAfter(employees?.lastUpdated, assessmentStartedAt);

        const yearFilter = currentAssessmentYear || null;
        const currentYearSubmissions = yearFilter
            ? submissions.filter(s => String(s.assessmentYear) === String(yearFilter))
            : submissions;

        const selfAssessment = currentYearSubmissions.find(s => s.fileType === "Self-Assessment");
        const actionPlan = currentYearSubmissions.find(s => s.fileType === "Action-Plan");

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
            currentAssessmentYear,
            assessmentStartedAt,
            needsRevalidation: assessmentStartedAt && (!isAgencyDone || !isEmployeeDone),
        };
    }, [profile, employees, submissions, validateEmployees, userDoc]);

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
        currentAssessmentYear: derived.currentAssessmentYear,
        needsRevalidation: derived.needsRevalidation,
    };
};
