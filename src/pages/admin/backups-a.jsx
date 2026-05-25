import { useState, useEffect, useCallback, useRef } from 'react';
import '../../css/admin/admin-dashboard.css';
import '../../css/admin/backups-a.css';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import { subscribeBackupHistory } from '../../firebase/collections/backupHistory';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import { authFetch } from '../../utils/apiClient';

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

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFileId, setRestoreFileId] = useState(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreCollections, setRestoreCollections] = useState([]);
  const [restoreSelected, setRestoreSelected] = useState([]);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreResultModal, setShowRestoreResultModal] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  const [showUploadRestoreModal, setShowUploadRestoreModal] = useState(false);
  const [uploadRestoreFile, setUploadRestoreFile] = useState(null);
  const [uploadRestoreFileName, setUploadRestoreFileName] = useState('');
  const [uploadRestoreCollections, setUploadRestoreCollections] = useState([]);
  const [uploadRestoreSelected, setUploadRestoreSelected] = useState([]);
  const [uploadRestoring, setUploadRestoring] = useState(false);

  const fileInputRef = useRef(null);

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

        setConfig(() => ({
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

  const openRestoreModal = (fileId, fileName, cols) => {
    setRestoreFileId(fileId);
    setRestoreFileName(fileName);
    setRestoreCollections(cols || []);
    setRestoreSelected(cols || []);
    setShowRestoreModal(true);
  };

  const toggleRestoreCollection = (col) => {
    setRestoreSelected(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const toggleSelectAllRestore = () => {
    if (restoreSelected.length === restoreCollections.length) {
      setRestoreSelected([]);
    } else {
      setRestoreSelected([...restoreCollections]);
    }
  };

  const handleRestore = async () => {
    if (restoreSelected.length === 0) {
      setError('Please select at least one collection to restore.');
      return;
    }
    setRestoring(true);
    setError('');
    try {
      const res = await authFetch('/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: restoreFileId, collections: restoreSelected })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setRestoreResult(data);
      setShowRestoreModal(false);
      setShowRestoreResultModal(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoring(false);
    }
  };

  const handleUploadBackupClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please select a valid JSON backup file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const cols = Object.keys(data).filter(k => Array.isArray(data[k]));
        if (cols.length === 0) {
          setError('No valid collections found in the uploaded file.');
          return;
        }
        setUploadRestoreFile(file);
        setUploadRestoreFileName(file.name);
        setUploadRestoreCollections(cols);
        setUploadRestoreSelected(cols);
        setShowUploadRestoreModal(true);
      } catch {
        setError('Failed to parse backup file. Please ensure it is valid JSON.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const toggleUploadRestoreCollection = (col) => {
    setUploadRestoreSelected(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const toggleSelectAllUploadRestore = () => {
    if (uploadRestoreSelected.length === uploadRestoreCollections.length) {
      setUploadRestoreSelected([]);
    } else {
      setUploadRestoreSelected([...uploadRestoreCollections]);
    }
  };

  const handleUploadRestore = async () => {
    if (uploadRestoreSelected.length === 0) {
      setError('Please select at least one collection to restore.');
      return;
    }
    if (!uploadRestoreFile) {
      setError('No backup file selected.');
      return;
    }
    setUploadRestoring(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadRestoreFile);
      formData.append('collections', JSON.stringify(uploadRestoreSelected));

      const res = await authFetch('/backup/restore-upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setRestoreResult(data);
      setShowUploadRestoreModal(false);
      setShowRestoreResultModal(true);
      setUploadRestoreFile(null);
      setUploadRestoreFileName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadRestoring(false);
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
                className="backups-btn-secondary"
                onClick={handleEstimate}
                disabled={estimating || config.collections.length === 0}
              >
                {estimating ? <Spinner size="sm" color="dark" /> : 'Calculate Size'}
              </button>
              <button
                className="backups-btn-primary"
                onClick={handleSaveConfig}
                disabled={savingConfig}
              >
                {savingConfig ? <Spinner size="sm" color="white" /> : 'Save Configuration'}
              </button>
              <button
                className="backups-btn-primary"
                onClick={handleRunBackup}
                disabled={runningBackup || config.collections.length === 0}
              >
                {runningBackup ? <Spinner size="sm" color="white" /> : 'Backup Now'}
              </button>
            </div>

            {(estimateResult || lastBackupResult) && (
              <div className="backups-form-results">
                {estimateResult && (
                  <span className="backups-estimate-result">
                    Estimated size: <strong>{estimateResult.sizeDisplay}</strong> ({estimateResult.totalDocs.toLocaleString()} documents)
                  </span>
                )}
                {lastBackupResult && (
                  <span className="backups-last-result">
                    Last backup: <strong>{lastBackupResult.sizeDisplay}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="backups-card">
          <div className="backups-card-header">
            <h2>Backup History</h2>
            <button className="backups-file-btn backups-file-btn-secondary" onClick={handleUploadBackupClick}>
              Upload Backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
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
                          {item.fileUrl && (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="backups-file-btn backups-file-btn-primary"
                            >
                              View in Drive
                            </a>
                          )}
                          {item.fileId && (
                            <button
                              className="backups-file-btn backups-file-btn-secondary"
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
                          {item.status === 'success' && item.fileId && (
                            <button
                              className="backups-file-btn backups-file-btn-warning"
                              onClick={() => openRestoreModal(item.fileId, item.fileName, item.collections)}
                            >
                              Restore
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

      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Restore Backup"
        variant="warning"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={() => setShowRestoreModal(false)}>
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-primary"
              onClick={handleRestore}
              disabled={restoring || restoreSelected.length === 0}
            >
              {restoring ? <Spinner size="sm" color="white" /> : 'Restore'}
            </button>
          </>
        }
      >
        <p className="modal-subtext">Select collections to restore from <strong>{restoreFileName}</strong>.</p>
        <p className="modal-subtext" style={{ color: '#856404', marginTop: '4px' }}>
          Existing documents will be skipped.
        </p>
        <div className="backups-restore-collections">
          <button className="backups-select-all-btn" onClick={toggleSelectAllRestore}>
            {restoreSelected.length === restoreCollections.length && restoreCollections.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </button>
          <div className="backups-collections-grid">
            {restoreCollections.map(col => (
              <label key={col} className="backups-collection-item">
                <input
                  type="checkbox"
                  checked={restoreSelected.includes(col)}
                  onChange={() => toggleRestoreCollection(col)}
                />
                <span>{col}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showUploadRestoreModal}
        onClose={() => setShowUploadRestoreModal(false)}
        title="Restore from Upload"
        variant="warning"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={() => setShowUploadRestoreModal(false)}>
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-primary"
              onClick={handleUploadRestore}
              disabled={uploadRestoring || uploadRestoreSelected.length === 0}
            >
              {uploadRestoring ? <Spinner size="sm" color="white" /> : 'Restore'}
            </button>
          </>
        }
      >
        <p className="modal-subtext">Select collections to restore from <strong>{uploadRestoreFileName}</strong>.</p>
        <p className="modal-subtext" style={{ color: '#856404', marginTop: '4px' }}>
          Existing documents will be skipped.
        </p>
        <div className="backups-restore-collections">
          <button className="backups-select-all-btn" onClick={toggleSelectAllUploadRestore}>
            {uploadRestoreSelected.length === uploadRestoreCollections.length && uploadRestoreCollections.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </button>
          <div className="backups-collections-grid">
            {uploadRestoreCollections.map(col => (
              <label key={col} className="backups-collection-item">
                <input
                  type="checkbox"
                  checked={uploadRestoreSelected.includes(col)}
                  onChange={() => toggleUploadRestoreCollection(col)}
                />
                <span>{col}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRestoreResultModal}
        onClose={() => setShowRestoreResultModal(false)}
        title="Restore Complete"
        variant="success"
        actions={
          <button className="modal-btn modal-btn-primary" onClick={() => setShowRestoreResultModal(false)}>
            OK
          </button>
        }
      >
        {restoreResult && (
          <div className="backups-restore-result">
            <p><strong>{restoreResult.restored}</strong> documents restored</p>
            <p><strong>{restoreResult.skipped}</strong> documents skipped (already existed)</p>
            {restoreResult.failed > 0 && (
              <p style={{ color: '#cc0000' }}><strong>{restoreResult.failed}</strong> documents failed</p>
            )}
            <div className="backups-restore-details">
              {Object.entries(restoreResult.collections).map(([col, stats]) => (
                <div key={col} className="backups-restore-col">
                  <strong>{col}</strong>: {stats.restored} restored, {stats.skipped} skipped
                  {stats.failed > 0 && `, ${stats.failed} failed`}
                  {stats.error && <span style={{ color: '#cc0000' }}> — {stats.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
