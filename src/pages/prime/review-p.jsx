import '../../css/prime/review-p';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export default function Pdashboard() {
  const nav = useNavigate();
  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">PRIME-HRM Officer Dashboard</h1>
        <button 
          className="prime-dashboard-button" 
          onClick={() => nav('/review-p')}
        >
          <img src={reviewIcon} width="30px" height="30px" alt="Review" className="white-filter"/>
          Review Submissions
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

        <div className="stat-card-prime">
          <div className="stat-icon">
            <img src={fileIcon} alt="Submissions" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.totalSubmissions}</h3>
            <p>Total Submissions</p>
          </div>
        </div>

        <div className="stat-card-prime pending">
          <div className="stat-icon">
            <img src={reviewIcon} alt="Pending" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.pendingReviews}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="prime-recent-section">
        <h2>Recent Submissions</h2>
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
                  <td colSpan="4" className="no-data">No submissions yet</td>
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
                      {sub.uploadedAt?.toDate().toLocaleDateString() || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clock */}
      <div className="stat-time stat-container">
        <div className="stat-time-clock">{formatTime(time)}</div>
        <div className="stat-time-date">{formatDate(time)}</div>
      </div>
    </main>
  );
}