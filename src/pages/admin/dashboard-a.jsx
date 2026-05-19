import '../../css/admin/admin-dashboard.css';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { logActivity } from '../../firebase/activityLog';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { useAdminData } from '../../hooks/useAdminData';
import { updateUser } from '../../firebase/collections/users';
import { deleteSubmissionsByUserId } from '../../firebase/collections/agencySubmissions';

import agencyIcon from '../../assets/agency.svg';
import fileIcon from '../../assets/file.svg';
import reviewIcon from '../../assets/review.svg';
import profileIcon from '../../assets/profile.svg';
import Modal from '../../components/Modal';

export default function Adashboard() {
  const nav = useNavigate();

  const { allUsers, stats, recentSubmissions, pendingDeletions, activityLogs, loading } = useAdminData();

  /* Reset Modal State */
  const [resetModal, setResetModal] = useState({ open: false, user: null });
  const [resetLoading, setResetLoading] = useState(false);

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
      case 'p': return 'CSC RO X';
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

  const openResetModal = (user) => {
    setResetModal({ open: true, user });
  };

  const closeResetModal = () => {
    setResetModal({ open: false, user: null });
  };

  const confirmReset = async () => {
    if (!resetModal.user) return;
    const targetUser = resetModal.user;
    setResetLoading(true);

    try {
      const deletedCount = await deleteSubmissionsByUserId(targetUser.id);

      await logActivity({
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        userRole: 'admin',
        action: 'UPDATE_PROFILE',
        targetUserId: targetUser.id,
        targetAgencyName: targetUser.email,
        details: { deletedSubmissions: deletedCount },
        message: `Admin reset submission progress for ${targetUser.email} (${deletedCount} submissions deleted)`
      });

      alert(`Reset complete. ${deletedCount} submission(s) deleted for ${targetUser.email}.`);
      closeResetModal();
    } catch (err) {
      console.error('Reset error:', err);
      alert('Failed to reset progress: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleApprovalStatus = async (userId, newStatus, userEmail, userRole) => {
    try {
      await updateUser(userId, { approvalStatus: newStatus });
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
            <img src={profileIcon} alt="CSC RO X" width="40" height="40" className="deep-blue-filter"/>
          </div>
          <div className="stat-info">
            <h3>{stats.primeOfficers}</h3>
            <p>CSC RO X</p>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">No users found</td>
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
                      <td>
                        {user.role === 'u' && (
                          <button
                            className="reset-user-btn"
                            onClick={() => openResetModal(user)}
                            title="Delete all submissions and reset workflow progress"
                          >
                            Reset
                          </button>
                        )}
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
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="no-data">No submissions yet</td>
                  </tr>
                ) : (
                  recentSubmissions.map((sub) => (
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
            <button onClick={() => nav('/deletion-requests-a')}>
              View All Deletion Requests →
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={resetModal.open}
        onClose={closeResetModal}
        title="Reset Agency Progress"
        variant="warning"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={closeResetModal}>
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-danger"
              onClick={confirmReset}
              disabled={resetLoading}
            >
              {resetLoading ? 'Resetting...' : 'Confirm Reset'}
            </button>
          </>
        }
      >
        <p style={{ fontWeight: 700, color: 'var(--deep-blue)', margin: '8px 0' }}>
          {resetModal.user?.email}
        </p>
        <p className="modal-subtext">
          This will permanently delete all submission records (Self-Assessment and Action Plan)
          from Firestore for this agency. The files in Google Drive will NOT be deleted.
          This action cannot be undone.
        </p>
      </Modal>

      {/* Clock */}
      <div className="stat-time stat-container">
        <div className="stat-time-clock">{formatTime(time)}</div>
        <div className="stat-time-date">{formatDate(time)}</div>
      </div>
    </main>
  );
}
