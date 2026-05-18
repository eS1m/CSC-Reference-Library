import '../../css/prime/prime-dashboard.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { usePrimeData } from '../../hooks/usePrimeData';

import reviewIcon from '../../assets/review.svg';
import agencyIcon from '../../assets/agency.svg';
import fileIcon from '../../assets/file.svg';

export default function Pdashboard() {
  const nav = useNavigate();
  
  const { stats, recentUploads, pendingDeletions, loading } = usePrimeData();

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
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentUploads.length === 0 ? (
                <tr>
                  <td colSpan="3" className="no-data">No uploads yet</td>
                </tr>
              ) : (
                recentUploads.map((sub) => (
                  <tr key={sub.id} onClick={() => window.open(sub.fileUrl, '_blank')}>
                    <td>{sub.agencyName}</td>
                    <td>{sub.fileName}</td>
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