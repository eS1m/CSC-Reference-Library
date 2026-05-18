import { useState, useEffect } from 'react';
import { subscribeUsers } from '../firebase/collections/users';
import { subscribeProfiles } from '../firebase/collections/agencyProfiles';
import { subscribeSubmissions } from '../firebase/collections/agencySubmissions';
import { subscribeDeletionRequests } from '../firebase/collections/deletionRequests';
import { validateAgency } from '../utils/validateAgency';

export function usePrimeData() {
  const [stats, setStats] = useState({
    totalAgencies: 0,
    completedProfiles: 0,
    totalSubmissions: 0
  });
  const [recentUploads, setRecentUploads] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubUsers = subscribeUsers((users) => {
      setStats(prev => ({ ...prev, totalAgencies: users.filter(u => u.role === 'u').length }));
    }, (err) => {
      console.error('Users listener error:', err);
      setError('Failed to load users');
    });

    const unsubProfiles = subscribeProfiles((profiles) => {
      const completed = profiles.filter(p => validateAgency(p)).length;
      setStats(prev => ({ ...prev, completedProfiles: completed }));
    }, (err) => {
      console.error('Profiles listener error:', err);
    });

    const unsubSubmissions = subscribeSubmissions({}, (submissions) => {
      const sorted = [...submissions].sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      setRecentUploads(sorted.slice(0, 5));
      setStats(prev => ({ ...prev, totalSubmissions: submissions.length }));
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

    return () => {
      unsubUsers();
      unsubProfiles();
      unsubSubmissions();
      unsubDeletions();
    };
  }, []);

  return {
    stats,
    recentUploads,
    pendingDeletions,
    loading,
    error
  };
}
