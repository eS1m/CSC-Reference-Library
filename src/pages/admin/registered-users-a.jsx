import '../../css/admin/admin-dashboard.css';
import '../../css/admin/registered-users-a.css';
import { useState, useEffect, useRef } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { updateUser } from '../../firebase/collections/users';
import { auth } from '../../firebase/config';
import { logActivity } from '../../firebase/activityLog';
import { deleteSubmissionsByUserId } from '../../firebase/collections/agencySubmissions';
import { authFetch } from '../../utils/apiClient';
import Modal from '../../components/Modal';

const SHOW_RESET_BUTTON = import.meta.env.VITE_SHOW_RESET_BUTTON === 'true';

export default function RegisteredUsersA() {
  const { allUsers, stats, loading } = useAdminData();

  const [resetModal, setResetModal] = useState({ open: false, user: null });
  const [resetLoading, setResetLoading] = useState(false);
  const [syncingUserId, setSyncingUserId] = useState(null);
  const autoSyncAttemptedRef = useRef(new Set());

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

  const handleSyncEmailVerified = async (userId) => {
    setSyncingUserId(userId);
    try {
      const res = await authFetch('/sync-email-verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId })
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn('Sync failed for', userId, data.error);
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncingUserId(null);
    }
  };

  // Auto-sync email verification for pending unverified users every 10 seconds
  useEffect(() => {
    const pendingUnverified = allUsers.filter(
      u => u.approvalStatus === 'pending' && !u.emailVerified
    );

    if (pendingUnverified.length === 0) return;

    // Sync immediately on mount for users we haven't tried yet
    pendingUnverified.forEach(user => {
      if (!autoSyncAttemptedRef.current.has(user.id)) {
        autoSyncAttemptedRef.current.add(user.id);
        handleSyncEmailVerified(user.id);
      }
    });

    const interval = setInterval(() => {
      const stillPending = allUsers.filter(
        u => u.approvalStatus === 'pending' && !u.emailVerified
      );
      stillPending.forEach(user => {
        handleSyncEmailVerified(user.id);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [allUsers]);

  if (loading) {
    return (
      <main className="main-content">
        <div className="main-content-header">
          <h1 id="main-content-title">Pending Users</h1>
        </div>
        <div className="registered-users-loading">Loading users...</div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Registered Users</h1>
      </div>

      <div className="registered-users-page">
        <div className="registered-users-stats">
          <div className="registered-users-stat">
            <span className="registered-users-stat-number">{stats.totalUsers}</span>
            <span className="registered-users-stat-label">Total Users</span>
          </div>
          <div className="registered-users-stat">
            <span className="registered-users-stat-number">{stats.regularUsers}</span>
            <span className="registered-users-stat-label">Agency Users</span>
          </div>
          <div className="registered-users-stat">
            <span className="registered-users-stat-number">{stats.primeOfficers}</span>
            <span className="registered-users-stat-label">CSC RO X</span>
          </div>
          <div className="registered-users-stat">
            <span className="registered-users-stat-number">
              {allUsers.filter(u => u.approvalStatus === 'pending').length}
            </span>
            <span className="registered-users-stat-label">Pending Approval</span>
          </div>
        </div>

        <div className="registered-users-table-card">
          <div className="admin-table-container">
            <table className="admin-submissions-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Approval Status</th>
                  <th>Email Verified</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">No users found</td>
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
                        <span className={`status-badge ${user.emailVerified ? 'approved' : 'rejected'}`}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                        {!user.emailVerified && (
                          <button
                            className="approve-user-btn"
                            onClick={() => handleSyncEmailVerified(user.id)}
                            disabled={syncingUserId === user.id}
                            title="Check Firebase Auth for updated verification status"
                            style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            {syncingUserId === user.id ? 'Checking...' : 'Check'}
                          </button>
                        )}
                      </td>
                      <td>{formatFirestoreDate(user.createdAt)}</td>
                      <td>
                        <div className="registered-users-actions">
                          {user.approvalStatus === 'pending' && (
                            <>
                              <button
                                className="approve-user-btn"
                                onClick={() => handleApprovalStatus(user.id, 'approved', user.email, user.role)}
                                disabled={!user.emailVerified}
                                title={!user.emailVerified ? 'Cannot approve until email is verified' : ''}
                              >
                                Approve
                              </button>
                              <button
                                className="reject-user-btn"
                                onClick={() => handleApprovalStatus(user.id, 'rejected', user.email, user.role)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {SHOW_RESET_BUTTON && user.role === 'u' && (
                            <button
                              className="reset-user-btn"
                              onClick={() => openResetModal(user)}
                              title="Delete all submissions and reset workflow progress"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
    </main>
  );
}
