import { useState, useEffect } from 'react';
import '../../css/admin/admin-dashboard.css';
import '../../css/admin/active-users-a.css';
import Spinner from '../../components/Spinner';
import { subscribeActiveSessions } from '../../firebase/collections/activeSessions';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';

const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000;
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

function getStatus(lastHeartbeat) {
  const hb = lastHeartbeat?.toMillis?.() || 0;
  const elapsed = Date.now() - hb;
  if (elapsed < ACTIVE_THRESHOLD_MS) return 'active';
  if (elapsed < IDLE_THRESHOLD_MS) return 'idle';
  return 'expired';
}

function formatRole(role) {
  switch (role) {
    case 'u': return 'Agency User';
    case 'p': return 'CSC RO X';
    case 'admin': return 'Administrator';
    default: return role || 'Unknown';
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'u': return 'role-user';
    case 'p': return 'role-prime';
    case 'admin': return 'role-admin';
    default: return 'role-unknown';
  }
}

export default function ActiveUsersA() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeActiveSessions(
      (snapshot) => {
        const now = Date.now();
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((s) => {
            const hb = s.lastHeartbeat?.toMillis?.() || 0;
            return now - hb < IDLE_THRESHOLD_MS;
          })
          .sort((a, b) => {
            const aTime = a.lastHeartbeat?.toMillis?.() || 0;
            const bTime = b.lastHeartbeat?.toMillis?.() || 0;
            return bTime - aTime;
          });
        setSessions(data);
        setLoading(false);
      },
      (err) => {
        console.error('Active sessions listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const activeCount = sessions.filter((s) => getStatus(s.lastHeartbeat) === 'active').length;
  const idleCount = sessions.filter((s) => getStatus(s.lastHeartbeat) === 'idle').length;

  if (loading) {
    return <div className="loading-screen">Loading Active Users...</div>;
  }

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Active Users</h1>
      </div>

      <div className="active-users-page">
        <div className="active-users-summary">
          <div className="summary-stat">
            <span className="summary-number">{activeCount}</span>
            <span className="summary-label">Active</span>
          </div>
          <div className="summary-stat">
            <span className="summary-number">{idleCount}</span>
            <span className="summary-label">Idle</span>
          </div>
          <div className="summary-stat">
            <span className="summary-number">{sessions.length}</span>
            <span className="summary-label">Total Online</span>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-submissions-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Login Time</th>
                <th>Last Active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">No users currently online</td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const status = getStatus(s.lastHeartbeat);
                  return (
                    <tr key={s.id}>
                      <td>{s.email || 'Unknown'}</td>
                      <td>
                        <span className={`role-badge ${getRoleBadgeClass(s.role)}`}>
                          {formatRole(s.role)}
                        </span>
                      </td>
                      <td>{formatFirestoreDate(s.loginAt, { includeTime: true })}</td>
                      <td>{formatFirestoreDate(s.lastHeartbeat, { includeTime: true })}</td>
                      <td>
                        <span className={`status-badge status-${status}`}>
                          {status === 'active' ? 'Active' : 'Idle'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
