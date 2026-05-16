import '../../css/prime/prime-dashboard.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { validateAgency } from '../../utils/validateAgency';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';

import reviewIcon from '../../assets/review.svg';
import agencyIcon from '../../assets/agency.svg';
import fileIcon from '../../assets/file.svg';

export default function Pdashboard() {
  const nav = useNavigate();
  
  /* Stats State */
  const [stats, setStats] = useState({
    totalAgencies: 0,
    completedProfiles: 0,
    approvedCount: 0,
    rejectedCount: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [pendingDeletions, setPendingDeletions] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Date and Time */
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour12: false,
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /* Fetch Stats */
  useEffect(() => {
    setLoading(true);

    // 1. Count total users with role "u"
    const usersQuery = query(collection(db, "users"), where("role", "==", "u"));
    
    // 2. Count completed agency profiles
    const profilesQuery = query(collection(db, "agencyProfiles"));
    
    // 3. All submissions
    const submissionsQuery = query(
      collection(db, "agencySubmissions"),
      where("fileType", "==", "Self-Assessment")
    );

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      setStats(prev => ({ ...prev, totalAgencies: snap.size }));
    });

    const unsubProfiles = onSnapshot(profilesQuery, (snap) => {
      let completed = 0;
      snap.forEach(doc => {
        completed += validateAgency(doc.data()) ? 1 : 0;
      });
      setStats(prev => ({ ...prev, completedProfiles: completed }));
    });

    const unsubSubmissions = onSnapshot(submissionsQuery, (snap) => {
      let approved = 0, rejected = 0;
      const recent = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        
        if (data.status === 'Approved') approved++;
        else if (data.status === 'Rejected') rejected++;
        
        recent.push({ id: doc.id, ...data });
      });
      
      // Sort by uploadedAt desc and take top 5
      recent.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      
      setStats(prev => ({ 
        ...prev, 
        approvedCount: approved,
        rejectedCount: rejected
      }));
      setRecentSubmissions(recent.slice(0, 5));
      setLoading(false);
    });

    const deletionsQuery = query(
      collection(db, 'deletionRequests'),
      where('status', '==', 'pending')
    );
    const unsubDeletions = onSnapshot(deletionsQuery, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      setPendingDeletions(data);
    });

    return () => {
      unsubUsers();
      unsubProfiles();
      unsubSubmissions();
      unsubDeletions();
    };
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading CSC RO X Dashboard...</div>;
  }

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">CSC RO X Dashboard</h1>
        <button 
          className="prime-dashboard-button" 
          onClick={() => nav('/drive-browser-csc')}
        >
          <img src={reviewIcon} width="30px" height="30px" alt="Drive Browser" className="white-filter"/>
          Drive Browser
        </button>
      </div>
      
      <div className="main-content-container prime-stats-grid">
        {/* Stat Cards */}
        <div className="stat-card-prime prime-agencies-number">
          <div className="stat-icon">
            <img src={agencyIcon} alt="Agencies" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.totalAgencies}</h3>
            <p>Total Registered Agencies</p>
          </div>
        </div>

        <div className="stat-card-prime">
          <div className="stat-icon">
            <img src={agencyIcon} alt="Completed" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.completedProfiles}</h3>
            <p>Completed Profiles</p>
          </div>
        </div>


      </div>

      {/* Recent Submissions Table */}
      <div className="prime-recent-section">
        <h2>Recent Uploads</h2>
        <div className="prime-table-container">
          <table className="prime-submissions-table">
            <thead>
              <tr>
                <th>Agency Name</th>
                <th>File Name</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="no-data">No uploads yet</td>
                </tr>
              ) : (
                recentSubmissions.map((sub) => (
                  <tr key={sub.id} onClick={() => window.open(sub.fileUrl, '_blank')}>
                    <td>{sub.agencyName}</td>
                    <td>{sub.fileName}</td>
                    <td>
                      <span className={`status-badge ${(sub.status || 'Pending').toLowerCase()}`}>
                        {sub.status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      {formatFirestoreDate(sub.uploadedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Deletion Requests */}
      {pendingDeletions.length > 0 && (
        <div className="deletion-preview-section">
          <h2>Pending Deletion Requests ({pendingDeletions.length})</h2>
          <div className="deletion-preview-table-wrapper">
            <table className="deletion-preview-table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>File</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingDeletions.slice(0, 5).map((req) => (
                  <tr key={req.id}>
                    <td>{req.agencyName}</td>
                    <td>{req.fileName}</td>
                    <td className="reason-cell">{req.reason}</td>
                    <td>{formatFirestoreDate(req.requestedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="view-all-link">
            <button onClick={() => nav('/deletion-requests-p')}>
              View All Deletion Requests →
            </button>
          </div>
        </div>
      )}

      {/* Clock */}
      <div className="stat-time stat-container">
        <div className="stat-time-clock">{formatTime(time)}</div>
        <div className="stat-time-date">{formatDate(time)}</div>
      </div>
    </main>
  );
}