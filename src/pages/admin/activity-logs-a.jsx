import '../../css/admin/admin-dashboard.css';
import React from 'react';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { useActivityLogs } from '../../hooks/useActivityLogs';

export default function ActivityLogsA() {
  const { activityLogs, loading } = useActivityLogs();

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

  if (loading) {
    return <div className="loading-screen">Loading Activity Logs...</div>;
  }

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Activity Logs</h1>
      </div>

      <div className="admin-logs-section" style={{ marginTop: '20px' }}>
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
                activityLogs.map((log) => (
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
        </div>
      </div>
    </main>
  );
}
