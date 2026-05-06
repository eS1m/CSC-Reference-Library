import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const useWorkflow = () => {
    const [data, setData] = useState({
        currentStep: 1,
        loading: true,
        agencyName: 'Agency User',
        isLocked: true, // For the Sidebar/Upload link
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const unsubProfile = onSnapshot(doc(db, "agencyProfiles", user.uid), (profileDoc) => {
                    const unsubEmployee = onSnapshot(doc(db, "agencyEmployees", user.uid), (empDoc) => {
                        const q = query(
                            collection(db, "agencySubmissions"),
                            where("userId", "==", user.uid),
                            where("fileType", "==", "Self-Assessment")
                        );

                        const unsubSub = onSnapshot(q, (subSnap) => {
                            const profileData = profileDoc.data();
                            const submission = subSnap.docs[0]?.data();

                            const req = ['agencyName', 'region', 'sector', 'status', 'resolutionStatus', 'headName', 'headDesignation'];
                            const isProfileComplete = profileDoc.exists() && req.every(f => profileData.agencyDetails?.[f]?.trim());
                            const isEmployeeComplete = empDoc.exists();
                            
                            let step = 1;
                            if (isProfileComplete) step = 2;
                            if (isProfileComplete && isEmployeeComplete) step = 3;
                            
                            if (submission) {
                                if (submission.status === 'Pending') step = 4;
                                else if (submission.status === 'Validated') step = 5; // Example
                            }

                            setData({
                                loading: false,
                                currentStep: step,
                                agencyName: profileData?.agencyDetails?.agencyName || 'Agency User',
                                isLocked: step < 3 || step === 4, 
                                userId: user.uid
                            });
                        });
                    });
                });
            } else {
                setData(prev => ({ ...prev, loading: false }));
            }
        });
        return () => unsubscribeAuth();
    }, []);

    return data;
};