import { useState, useEffect, useCallback } from 'react';
import '../../css/admin/admin-dashboard.css';
import '../../css/admin/backups-a.css';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import { subscribeBackupHistory } from '../../firebase/collections/backupHistory';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { authFetch, API_BASE_URL } from '../../utils/apiClient';
import { auth } from '../../firebase/config';

const FREQUENCY_OPTIONS = [
  { value: 'manual', label: 'Manual only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function BackupsA() {
  const [collections, setCollections] = useState([]);
  const [config, setConfig] = useState({ enabled: false, frequency: 'manual', collections: [] });
  const [history, setHistory] = useState([]);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const [estimateResult, setEstimateResult] = useState(null);
  const [lastBackupResult, setLastBackupResult] = useState(null);

  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load config and collections on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [configRes, colRes] = await Promise.all([
          authFetch('/backup/config'),
          authFetch('/backup/collections')
        ]);

        if (cancelled) return;

        const configData = await configRes.json();
        const colData = await colRes.json();

        setConfig(prev => ({
          enabled: configData.config?.enabled ?? false,
          frequency: configData.config?.frequency ?? 'manual',
          collections: configData.config?.collections ?? [],
        }));
        setCollections(colData.collections || []);
      } catch (err) {
        console.error('Failed to load backup data:', err);
        setError('Failed to load backup configuration. Please ensure the backend is running.');
      } finally {
        setLoadingConfig(false);
        setLoadingCollections(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Subscribe to backup history
  useEffect(() => {
    const unsubscribe = subscribeBackupHistory(
      (data) => setHistory(data),
      (err) => console.error('Backup history subscription error:', err)
    );
    return () => unsubscribe();
  }, []);

  const toggleCollection = useCallback((col) => {
    setConfig(prev => {
      const next = prev.collections.includes(col)
        ? prev.collections.filter(c => c !== col)
        : [...prev.collections, col];
      return { ...prev, collections: next };
    });
    setEstimateResult(null);
  }, []);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError('');
    try {
      const res = await authFetch('/backup/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Failed to save configuration');
      setSuccessMessage('Backup configuration saved successfully.');
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleEstimate = async () => {
    if (config.collections.length === 0) {
      setError('Please select at least one collection to estimate.');
      return;
    }
    setEstimating(true);
    setError('');
    setEstimateResult(null);
    try {
      const res = await authFetch('/backup/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: config.collections })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Estimate failed');
      setEstimateResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setEstimating(false);
    }
  };

  const handleRunBackup = async () => {
    if (config.collections.length === 0) {
      setError('Please select at least one collection to backup.');
      return;
    }
    setRunningBackup(true);
    setError('');
    setLastBackupResult(null);
    try {
      const res = await authFetch('/backup/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections: config.collections })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backup failed');
      setLastBackupResult(data);
      setSuccessMessage(`Backup created successfully! File size: ${data.sizeDisplay}`);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunningBackup(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    if (!fileId) return;
    setDownloadingId(fileId);
    try {
      const response = await authFetch(
        `/backup/download?fileId=${encodeURIComponent(fileId)}&fileName=${encodeURIComponent(fileName || '')}`
      );
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const lastSuccessfulBackup = history.find(h => h.status === 'success');

  if (loadingConfig && loadingCollections) {
    return (
      <main className="main-content">
        <div className="main-content-header">
          <h1 id="main-content-title">Backups</h1>
        </div>
        <div className="backups-page">
          <div className="backups-loading">
            <Spinner size="lg" color="primary" />
            <p>Loading backup settings...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Backups</h1>
      </div>

      <div className="backups-page">
        {error && (
          <div className="backups-error-banner">
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        {/* Stats */}
        <div className="backups-stats">
          <div className="backups-stat-card">
            <span className="backups-stat-number">{history.filter(h => h.status === 'success').length}</span>
            <span className="backups-stat-label">Total Backups</span>
          </div>
          <div className="backups-stat-card">
            <span className="backups-stat-number">
              {lastSuccessfulBackup ? formatFirestoreDate(lastSuccessfulBackup.timestamp, { includeTime: true }) : 'Never'}
            </span>
            <span className="backups-stat-label">Last Backup</span>
          </div>
          <div className="backups-stat-card">
            <span className="backups-stat-number">{config.frequency === 'manual' ? 'Manual' : config.frequency}</span>
            <span className="backups-stat-label">Frequency</span>
          </div>
        </div>

        {/* Configuration */}
        <div className="backups-card">
          <div className="backups-card-header">
            <h2>Backup Configuration</h2>
          </div>

          <div className="backups-form">
            <div className="backups-form-row">
              <label className="backups-toggle-label">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <span className="backups-toggle-text">Enable automatic backups</span>
              </label>
            </div>

            <div className="backups-form-row">
              <label className="backups-form-label">Frequency</label>
              <select
                className="backups-form-select"
                value={config.frequency}
                onChange={e => setConfig(prev => ({ ...prev, frequency: e.target.value }))}
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="backups-form-row">
              <label className="backups-form-label">Collections to Include</label>
              <div className="backups-collections-grid">
                {collections.map(col => (
                  <label key={col} className="backups-collection-item">
                    <input
                      type="checkbox"
                      checked={config.collections.includes(col)}
                      onChange={() => toggleCollection(col)}
                    />
                    <span>{col}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="backups-form-actions">
              <button
                className="backups-btn-primary"
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                {savingConfig ? <Spinner size="sm" color="white" /> : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="backups-card">
          <div className="backups-card-header">
            <h2>Actions</h2>
          </div>

          <div className="backups-actions">
            <div className="backups-action-row">
              <button
                className="backups-btn-secondary"
                onClick={handleEstimate}
                disabled={estimating || config.collections.length === 0}
              >
                {estimating ? <Spinner size="sm" color="dark" /> : 'Calculate Size'}
              </button>
              {estimateResult && (
                <span className="backups-estimate-result">
                  Estimated size: <strong>{estimateResult.sizeDisplay}</strong> ({estimateResult.totalDocs.toLocaleString()} documents)
                </span>
              )}
            </div>

            <div className="backups-action-row">
              <button
                className="backups-btn-primary"
                onClick={handleRunBackup}
                disabled={runningBackup || config.collections.length === 0}
              >
                {runningBackup ? <Spinner size="sm" color="white" /> : 'Backup Now'}
              </button>
              {lastBackupResult && (
                <span className="backups-last-result">
                  Last backup: <strong>{lastBackupResult.sizeDisplay}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="backups-card">
          <div className="backups-card-header">
            <h2>Backup History</h2>
          </div>

          <div className="backups-table-container">
            <table className="admin-submissions-table backups-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Size</th>
                  <th>Documents</th>
                  <th>Collections</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">No backups yet</td>
                  </tr>
                ) : (
                  history.map(item => (
                    <tr key={item.id}>
                      <td>{formatFirestoreDate(item.timestamp, { includeTime: true })}</td>
                      <td>
                        <span className={`status-badge ${item.status === 'success' ? 'status-approved' : 'status-rejected'}`}>
                          {item.status === 'success' ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td>{item.sizeDisplay || '—'}</td>
                      <td>{item.totalDocs?.toLocaleString() ?? '—'}</td>
                      <td>{item.collections?.join(', ') || '—'}</td>
                      <td>
                        <div className="backups-file-actions">
                          {item.fileId && (
                            <button
                              className="backups-file-link"
                              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                              onClick={async () => {
                                try {
                                  const token = await auth.currentUser?.getIdToken();
                                  window.open(`${API_BASE_URL}/file-proxy/${item.fileId}?token=${token}`, '_blank');
                                } catch (err) {
                                  console.error('View error:', err);
                                }
                              }}
                            >
                              View in Drive
                            </button>
                          )}
                          {item.fileId && (
                            <button
                              className="backups-file-download-btn"
                              onClick={() => handleDownload(item.fileId, item.fileName)}
                              disabled={downloadingId === item.fileId}
                            >
                              {downloadingId === item.fileId ? (
                                <Spinner size="xs" color="primary" />
                              ) : (
                                'Download'
                              )}
                            </button>
                          )}
                          {!item.fileUrl && !item.fileId && '—'}
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
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
        variant="success"
        actions={
          <button className="modal-btn modal-btn-primary" onClick={() => setShowSuccessModal(false)}>
            OK
          </button>
        }
      >
        {successMessage}
      </Modal>
    </main>
  );
}
