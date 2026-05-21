import { useState, useEffect } from 'react';
import { subscribeUsers } from '../firebase/collections/users';
import { subscribeProfiles } from '../firebase/collections/agencyProfiles';
import { subscribeSubmissions } from '../firebase/collections/agencySubmissions';
import { subscribeDeletionRequests } from '../firebase/collections/deletionRequests';
import { subscribeActivityLogs } from '../firebase/collections/activityLogs';
import { validateAgency } from '../utils/validateAgency';

export function useAdminData() {
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({
    totalAgencies: 0,
    completedProfiles: 0,
    totalSubmissions: 0,
    totalUsers: 0,
    primeOfficers: 0,
    regularUsers: 0,
    adminUsers: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubUsers = subscribeUsers((users) => {
      let total = 0, prime = 0, regular = 0, admin = 0;
      users.forEach(u => {
        total++;
        if (u.role === 'p') prime++;
        else if (u.role === 'u') regular++;
        else if (u.role === 'admin') admin++;
      });
      setAllUsers(users);
      setStats(prev => ({ ...prev, totalUsers: total, primeOfficers: prime, regularUsers: regular, adminUsers: admin }));
    }, (err) => {
      console.error('Users listener error:', err);
      setError('Failed to load users');
    });

    const unsubProfiles = subscribeProfiles((profiles) => {
      const completed = profiles.filter(p => validateAgency(p)).length;
      setStats(prev => ({ ...prev, completedProfiles: completed, totalAgencies: profiles.length }));
    }, (err) => {
      console.error('Profiles listener error:', err);
    });

    const unsubSubmissions = subscribeSubmissions({ fileType: 'Self-Assessment' }, (submissions) => {
      const sorted = [...submissions].sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      setStats(prev => ({ ...prev, totalSubmissions: submissions.length }));
      setRecentSubmissions(sorted.slice(0, 5));
      setLoading(false);
    }, (err) => {
      console.error('Submissions listener error:', err);
      setLoading(false);
    });

    const unsubDeletions = subscribeDeletionRequests({ status: 'pending' }, (requests) => {
      const sorted = [...requests].sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      setPendingDeletions(sorted);
    }, (err) => {
      console.error('Deletions listener error:', err);
    });

    const unsubLogs = subscribeActivityLogs({}, (logs) => {
      setActivityLogs(logs);
    }, (err) => {
      console.error('Activity logs listener error:', err);
    });

    return () => {
      unsubUsers();
      unsubProfiles();
      unsubSubmissions();
      unsubDeletions();
      unsubLogs();
    };
  }, []);

  return {
    allUsers,
    stats,
    recentSubmissions,
    pendingDeletions,
    activityLogs,
    loading,
    error
  };
}
