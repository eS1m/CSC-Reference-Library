import '../../css/admin/admin-dashboard.css';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../../firebase/config';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { logActivity } from '../../firebase/activityLog';
import { validateAgency } from '../../utils/validateAgency';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';

import agencyIcon from '../../assets/agency.svg';
import fileIcon from '../../assets/file.svg';
import reviewIcon from '../../assets/review.svg';
import profileIcon from '../../assets/profile.svg';

export default function Adashboard() {
  /* Stats State */
  const [stats, setStats] = useState({
    totalAgencies: 0,
    completedProfiles: 0,
    totalSubmissions: 0,
    pendingReviews: 0,
    approvedCount: 0,
    rejectedCount: 0,
    totalUsers: 0,
    primeOfficers: 0,
    regularUsers: 0,
    adminUsers: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
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

  const formatRole = (role) => {
    switch (role) {
      case 'u': return 'Agency User';
      case 'p': return 'PRIME Officer';
      case 'admin': return 'Administrator';
      default: return role || 'Unknown';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'u': return 'role-user';
      case 'p': return 'role-prime';
      case 'admin': return 'role-admin';
      default: return 'role-unknown';
    }
  };

  const formatAction = (action) => {
    switch (action) {
      case 'UPLOAD_FILE': return 'File Upload';
      case 'APPROVE_FILE': return 'Approved File';
      case 'REJECT_FILE': return 'Rejected File';
      case 'UPDATE_PROFILE': return 'Updated Profile';
      case 'UPDATE_EMPLOYEES': return 'Updated Employees';
      case 'REGISTER': return 'Registered';
      case 'LOGIN': return 'Logged In';
      case 'APPROVE_USER': return 'Approved User';
      case 'REJECT_USER': return 'Rejected User';
      default: return action;
    }
  };

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'UPLOAD_FILE': return 'action-upload';
      case 'APPROVE_FILE': return 'action-approve';
      case 'REJECT_FILE': return 'action-reject';
      case 'UPDATE_PROFILE': return 'action-profile';
      case 'UPDATE_EMPLOYEES': return 'action-employee';
      case 'REGISTER': return 'action-register';
      case 'LOGIN': return 'action-login';
      case 'APPROVE_USER': return 'action-approve';
      case 'REJECT_USER': return 'action-reject';
      default: return '';
    }
  };

  const handleApprovalStatus = async (userId, newStatus, userEmail, userRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { approvalStatus: newStatus });
      await logActivity({
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        userRole: 'admin',
        action: newStatus === 'approved' ? 'APPROVE_USER' : 'REJECT_USER',
        targetUserId: userId,
        details: { targetEmail: userEmail, targetRole: userRole },
        message: `Admin ${auth.currentUser?.email || 'unknown'} ${newStatus} account for ${userEmail}`
      });
    } catch (err) {
      console.error("Error updating approval status:", err);
      alert("Failed to update approval status. Please try again.");
    }
  };

  /* Fetch Stats */
  useEffect(() => {
    setLoading(true);

    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const profilesQuery = query(collection(db, "agencyProfiles"));
    const submissionsQuery = query(
      collection(db, "agencySubmissions"),
      where("fileType", "==", "Self-Assessment")
    );

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      let total = 0, prime = 0, regular = 0, admin = 0;
      const users = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        total++;
        users.push({ id: doc.id, ...data });
        
        if (data.role === 'p') prime++;
        else if (data.role === 'u') regular++;
        else if (data.role === 'admin') admin++;
      });
      
      setStats(prev => ({ 
        ...prev, 
        totalUsers: total,
        primeOfficers: prime,
        regularUsers: regular,
        adminUsers: admin
      }));
      setAllUsers(users);
    });

    const unsubProfiles = onSnapshot(profilesQuery, (snap) => {
      let completed = 0;
      snap.forEach(doc => {
        completed += validateAgency(doc.data()) ? 1 : 0;
      });
      setStats(prev => ({ ...prev, completedProfiles: completed }));
    });

    const unsubSubmissions = onSnapshot(submissionsQuery, (snap) => {
      let total = 0, pending = 0, approved = 0, rejected = 0;
      const recent = [];
      
      snap.forEach(doc => {
        const data = doc.data();
        total++;
        
        if (data.status === 'Pending') pending++;
        else if (data.status === 'Approved') approved++;
        else if (data.status === 'Rejected') rejected++;
        
        recent.push({ id: doc.id, ...data });
      });
      
      recent.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      
      setStats(prev => ({ 
        ...prev, 
        totalSubmissions: total, 
        pendingReviews: pending,
        approvedCount: approved,
        rejectedCount: rejected
      }));
      setRecentSubmissions(recent.slice(0, 5));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubProfiles();
      unsubSubmissions();
    };
  }, []);

  /* Fetch Activity Logs */
  useEffect(() => {
    const logsQuery = query(collection(db, "activityLogs"), orderBy("timestamp", "desc"));
    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      const logs = [];
      snap.forEach(docSnap => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setActivityLogs(logs);
    }, (err) => {
      console.error("Error fetching activity logs:", err);
    });
    return () => unsubLogs();
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading Admin Dashboard...</div>;
  }

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">System Administrator Dashboard</h1>
      </div>
      
      <div className="main-content-container admin-stats-grid">
        {/* User Stats */}
        <div className="stat-card-admin">
          <div className="stat-icon">
            <img src={agencyIcon} alt="Agencies" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.regularUsers}</h3>
            <p>Agency Users</p>
          </div>
        </div>

        <div className="stat-card-admin">
          <div className="stat-icon">
            <img src={profileIcon} alt="PRIME Officers" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.primeOfficers}</h3>
            <p>PRIME Officers</p>
          </div>
        </div>

        <div className="stat-card-admin">
          <div className="stat-icon">
            <img src={fileIcon} alt="Submissions" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.totalSubmissions}</h3>
            <p>Total Submissions</p>
          </div>
        </div>

        <div className="stat-card-admin pending">
          <div className="stat-icon">
            <img src={reviewIcon} alt="Pending" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.pendingReviews}</h3>
            <p>Pending Reviews</p>
          </div>
        </div>
      </div>

      {/* Tables Row — Pending + All Users */}
      <div className="admin-tables-row">
        {allUsers.filter(u => u.approvalStatus === 'pending').length > 0 && (
          <div className="admin-pending-section">
            <h2>Pending Account Approvals ({allUsers.filter(u => u.approvalStatus === 'pending').length})</h2>
            <div className="admin-table-container">
              <table className="admin-submissions-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Requested Role</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.filter(u => u.approvalStatus === 'pending').map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td>{formatFirestoreDate(user.createdAt)}</td>
                      <td>
                        <div className="approval-actions">
                          <button 
                            className="approve-user-btn"
                            onClick={() => handleApprovalStatus(user.id, 'approved', user.email, user.role)}
                          >
                            Approve
                          </button>
                          <button 
                            className="reject-user-btn"
                            onClick={() => handleApprovalStatus(user.id, 'rejected', user.email, user.role)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="admin-users-section">
          <h2>All Registered Users ({stats.totalUsers})</h2>
          <div className="admin-table-container">
            <table className="admin-submissions-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Approval Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">No users found</td>
                  </tr>
                ) : (
                  allUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="mono-cell">{user.id}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${(user.approvalStatus || 'approved').toLowerCase()}`}>
                          {user.approvalStatus || 'Approved'}
                        </span>
                      </td>
                      <td>
                        {formatFirestoreDate(user.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Second Tables Row — Submissions + Logs */}
      <div className="admin-tables-row">
        {/* Recent Submissions Table */}
        <div className="admin-recent-section">
          <h2>Recent Submissions</h2>
          <div className="admin-table-container">
            <table className="admin-submissions-table">
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
                        {formatFirestoreDate(sub.uploadedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs Section */}
        <div className="admin-logs-section">
          <h2>Recent Activity Logs</h2>
          <div className="admin-table-container">
            <table className="admin-submissions-table activity-logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="no-data">No activity logs yet</td>
                  </tr>
                ) : (
                  activityLogs.slice(0, 10).map((log) => (
                    <tr key={log.id}>
                      <td>
                        {formatFirestoreDate(log.timestamp, { includeTime: true })}
                      </td>
                      <td>
                        <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td>{log.userEmail || 'Unknown'}</td>
                      <td>{log.message || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {activityLogs.length > 10 && (
              <div className="view-all-logs-link">
                <Link to="/activity-logs-a">View All Activity Logs →</Link>
              </div>
            )}
          </div>
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
