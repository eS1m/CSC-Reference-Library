import { useState, useEffect } from 'react';
import '../../css/admin/admin-dashboard.css';
import '../../css/admin/activity-logs-a.css';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import {
  deleteActivityLogs,
  deleteExpiredActivityLogs,
  ACTIVITY_LOG_RETENTION_DAYS
} from '../../firebase/collections/activityLogs';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

export default function ActivityLogsA() {
  const { activityLogs, loading } = useActivityLogs();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [lastCheckedId, setLastCheckedId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    deleteExpiredActivityLogs().catch((err) => {
      console.error('Activity log retention cleanup error:', err);
    });
  }, []);

  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set(activityLogs.map(log => log.id));
      const next = new Set([...prev].filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [activityLogs]);

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

  const allSelected = activityLogs.length > 0 && selectedIds.size === activityLogs.length;
  const someSelected = selectedIds.size > 0;

  const enterEditMode = () => {
    setIsEditMode(true);
    setLastCheckedId(null);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setSelectedIds(new Set());
    setLastCheckedId(null);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activityLogs.map(log => log.id)));
    }
    setLastCheckedId(null);
  };

  const toggleSelectRow = (logId, shiftKey) => {
    if (shiftKey && lastCheckedId && lastCheckedId !== logId) {
      const ids = activityLogs.map(log => log.id);
      const startIdx = ids.indexOf(lastCheckedId);
      const endIdx = ids.indexOf(logId);

      if (startIdx !== -1 && endIdx !== -1) {
        const [start, end] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        setSelectedIds(prev => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            next.add(ids[i]);
          }
          return next;
        });
        setLastCheckedId(logId);
        return;
      }
    }

    setLastCheckedId(logId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const openDeleteModal = () => {
    if (!someSelected) return;
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteError('');
  };

  const confirmDeleteSelected = async () => {
    if (!someSelected) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await deleteActivityLogs([...selectedIds]);
      setSelectedIds(new Set());
      setDeleteModalOpen(false);
      setIsEditMode(false);
    } catch (err) {
      console.error('Error deleting activity logs:', err);
      setDeleteError('Failed to delete selected logs. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading Activity Logs...</div>;
  }

  const selectColClass = `log-select-col ${!isEditMode ? 'log-select-col-hidden' : ''}`;

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Activity Logs</h1>
      </div>

      <div className="admin-logs-section" style={{ marginTop: '20px' }}>
        <div className="activity-logs-toolbar">
          <p className="activity-logs-toolbar-hint">
            Logs older than {ACTIVITY_LOG_RETENTION_DAYS} days are removed automatically when you open this page.
            {isEditMode && (
              <span style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem', color: 'var(--stat-description)' }}>
                Tip: Hold Shift and click two checkboxes to select a range.
              </span>
            )}
          </p>
          <div className="activity-logs-toolbar-actions">
            {isEditMode && someSelected && (
              <span className="activity-logs-selected-count">
                {selectedIds.size} selected
              </span>
            )}
            {isEditMode ? (
              <>
                <button
                  type="button"
                  className="activity-logs-cancel-btn"
                  onClick={exitEditMode}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="activity-logs-delete-btn"
                  onClick={openDeleteModal}
                  disabled={!someSelected}
                >
                  Delete Selected
                </button>
              </>
            ) : (
              <button
                type="button"
                className="activity-logs-edit-btn"
                onClick={enterEditMode}
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-submissions-table activity-logs-table">
            <thead>
              <tr>
                <th className={selectColClass}>
                  <input
                    type="checkbox"
                    className="log-select-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={activityLogs.length === 0 || !isEditMode}
                    aria-label="Select all logs"
                  />
                </th>
                <th className="log-time-col">Time</th>
                <th className="log-action-col">Action</th>
                <th className="log-user-col">User</th>
                <th className="log-details-col">Details</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.length === 0 ? (
                <tr>
                  <td colSpan={isEditMode ? 5 : 4} className="no-data">No activity logs yet</td>
                </tr>
              ) : (
                activityLogs.map((log) => {
                  const isSelected = selectedIds.has(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={isSelected ? 'log-row-selected' : ''}
                    >
                      <td className={selectColClass}>
                        <input
                          type="checkbox"
                          className="log-select-checkbox"
                          checked={isSelected}
                          onClick={(e) => toggleSelectRow(log.id, e.shiftKey)}
                          onChange={() => {}}
                          aria-label={`Select log from ${formatFirestoreDate(log.timestamp, { includeTime: true })}`}
                        />
                      </td>
                      <td className="log-time-col">
                        {formatFirestoreDate(log.timestamp, { includeTime: true })}
                      </td>
                      <td className="log-action-col">
                        <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="log-user-col">{log.userEmail || 'Unknown'}</td>
                      <td className="log-details-col">{log.message || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Activity Logs"
        variant="danger"
        actions={
          <>
            <button
              type="button"
              className="modal-btn modal-btn-secondary"
              onClick={closeDeleteModal}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="modal-btn modal-btn-danger"
              onClick={confirmDeleteSelected}
              disabled={deleting}
            >
              {deleting ? <Spinner size="sm" color="white" /> : 'Delete'}
            </button>
          </>
        }
      >
        <p>
          Delete <strong>{selectedIds.size}</strong> selected log{selectedIds.size === 1 ? '' : 's'}?
        </p>
        <p className="modal-subtext" style={{ color: '#c0392b', fontWeight: 500 }}>
          This action cannot be undone.
        </p>
        {deleteError && (
          <p className="modal-subtext" style={{ color: '#c0392b' }}>{deleteError}</p>
        )}
      </Modal>
    </main>
  );
}
