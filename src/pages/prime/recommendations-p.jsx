import { useState, useEffect, useRef, useCallback } from 'react';
import '../../css/prime/recommendations-p.css';
import { db } from '../../firebase/config';
import { auth } from '../../firebase/config';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RecommendationsP() {
  const [recommendations, setRecommendations] = useState([]);
  const [completedAgencies, setCompletedAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingStates, setUploadingStates] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const fileInputRefs = useRef({});

  /* Fetch recommendations in real-time */
  useEffect(() => {
    const q = query(collection(db, 'recommendations'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecommendations(data);
      setLoading(false);
    }, (err) => {
      console.error('Recommendations listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* Fetch agencies that have completed all 5 steps */
  useEffect(() => {
    async function fetchCompletedAgencies() {
      try {
        const submissionsSnap = await getDocs(collection(db, 'agencySubmissions'));
        const agencyCounts = {};
        submissionsSnap.docs.forEach(d => {
          const data = d.data();
          if (!agencyCounts[data.userId]) {
            agencyCounts[data.userId] = { selfAssessment: false, actionPlan: false };
          }
          if (data.fileType === 'Self-Assessment') agencyCounts[data.userId].selfAssessment = true;
          if (data.fileType === 'Action-Plan') agencyCounts[data.userId].actionPlan = true;
        });

        const completedIds = Object.entries(agencyCounts)
          .filter(([_, counts]) => counts.selfAssessment && counts.actionPlan)
          .map(([uid]) => uid);

        if (completedIds.length === 0) {
          setCompletedAgencies([]);
          return;
        }

        const profilesSnap = await getDocs(collection(db, 'agencyProfiles'));
        const agencies = profilesSnap.docs
          .filter(d => completedIds.includes(d.id))
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.agencyDetails?.agencyName || 'Unknown Agency'
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setCompletedAgencies(agencies);
      } catch (err) {
        console.error('Error fetching completed agencies:', err);
      }
    }

    fetchCompletedAgencies();
  }, []);

  const usedAgencyIds = recommendations
    .map(r => r.agencyId)
    .filter(Boolean);

  const availableAgencies = completedAgencies.filter(
    a => !usedAgencyIds.includes(a.id)
  );

  const handleAddAgency = async () => {
    try {
      await addDoc(collection(db, 'recommendations'), {
        agencyId: '',
        agencyName: '',
        fieldDirector: '',
        assistPlan: null,
        progressLog: null,
        progressLogFullyImplemented: false,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || ''
      });
    } catch (err) {
      console.error('Error adding recommendation:', err);
    }
  };

  const handleDelete = async (recId) => {
    if (!window.confirm('Delete this recommendation?')) return;
    try {
      await deleteDoc(doc(db, 'recommendations', recId));
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleAgencyChange = async (recId, agencyId) => {
    const agency = completedAgencies.find(a => a.id === agencyId);
    try {
      await updateDoc(doc(db, 'recommendations', recId), {
        agencyId: agencyId,
        agencyName: agency?.name || ''
      });
    } catch (err) {
      console.error('Error updating agency:', err);
    }
  };

  const handleFieldDirectorChange = async (recId, value) => {
    try {
      await updateDoc(doc(db, 'recommendations', recId), {
        fieldDirector: value
      });
    } catch (err) {
      console.error('Error updating field director:', err);
    }
  };

  const handleCheckboxChange = async (recId, checked) => {
    try {
      await updateDoc(doc(db, 'recommendations', recId), {
        progressLogFullyImplemented: checked
      });
    } catch (err) {
      console.error('Error updating checkbox:', err);
    }
  };

  const triggerFileInput = (recId, fileType) => {
    const key = `${recId}-${fileType}`;
    if (fileInputRefs.current[key]) {
      fileInputRefs.current[key].click();
    }
  };

  const handleFileUpload = async (recId, fileType, file) => {
    if (!file) return;
    const rec = recommendations.find(r => r.id === recId);
    if (!rec?.agencyName) return;

    const stateKey = `${recId}-${fileType}`;
    setUploadingStates(prev => ({ ...prev, [stateKey]: true }));
    setUploadErrors(prev => ({ ...prev, [stateKey]: '' }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agencyName', rec.agencyName);
    formData.append('fileType', fileType);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Upload failed');
      }

      const driveData = await response.json();
      const fileData = {
        fileId: driveData.fileId,
        fileName: driveData.fileName,
        fileUrl: `https://drive.google.com/file/d/${driveData.fileId}/view`,
        uploadedAt: serverTimestamp(),
        uploadedBy: auth.currentUser?.uid || ''
      };

      const field = fileType === 'Assist-Plan' ? 'assistPlan' : 'progressLog';
      await updateDoc(doc(db, 'recommendations', recId), {
        [field]: fileData
      });
    } catch (err) {
      console.error('Upload error:', err);
      setUploadErrors(prev => ({ ...prev, [stateKey]: err.message || 'Upload failed' }));
    } finally {
      setUploadingStates(prev => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleFileInputChange = (recId, fileType, e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (file) {
      handleFileUpload(recId, fileType, file);
    }
  };

  const handleViewFile = (url) => {
    if (url) window.open(url, '_blank');
  };

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Recommendations</h1>
      </div>

      <div className="recommendations-page">
        {loading && (
          <div className="rec-loading">
            <div className="rec-spinner"></div>
            <span>Loading recommendations...</span>
          </div>
        )}

        {!loading && recommendations.length === 0 && (
          <p className="rec-empty">No recommendations yet. Click "Add Agency" to begin.</p>
        )}

        <div className="rec-cards">
          {recommendations.map(rec => (
            <div key={rec.id} className="rec-card">
              <button
                className="rec-delete-btn"
                onClick={() => handleDelete(rec.id)}
                title="Delete recommendation"
              >
                ×
              </button>

              {/* Row 1: Agency dropdown */}
              <div className="rec-row">
                <label className="rec-label">Name of Agency:</label>
                <select
                  className="rec-select"
                  value={rec.agencyId || ''}
                  onChange={(e) => handleAgencyChange(rec.id, e.target.value)}
                >
                  <option value="">Select an agency...</option>
                  {rec.agencyId && (
                    <option value={rec.agencyId}>
                      {rec.agencyName}
                    </option>
                  )}
                  {availableAgencies.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: Field Director */}
              {rec.agencyId && (
                <div className="rec-row">
                  <label className="rec-label">Field Director:</label>
                  <input
                    type="text"
                    className="rec-input"
                    placeholder="Enter field director name..."
                    value={rec.fieldDirector || ''}
                    onChange={(e) => handleFieldDirectorChange(rec.id, e.target.value)}
                  />
                </div>
              )}

              {/* Row 3: Upload buttons */}
              {rec.agencyId && (
                <div className="rec-upload-row">
                  {/* Assist Plan */}
                  <div className="rec-upload-cell">
                    <input
                      type="file"
                      className="rec-file-input"
                      ref={(el) => { fileInputRefs.current[`${rec.id}-Assist-Plan`] = el; }}
                      onChange={(e) => handleFileInputChange(rec.id, 'Assist-Plan', e)}
                    />
                    {rec.assistPlan ? (
                      <button
                        className="rec-file-btn uploaded"
                        onClick={() => handleViewFile(rec.assistPlan.fileUrl)}
                        title="Open in Google Drive"
                      >
                        {rec.assistPlan.fileName}
                      </button>
                    ) : (
                      <button
                        className="rec-file-btn upload"
                        onClick={() => triggerFileInput(rec.id, 'Assist-Plan')}
                        disabled={uploadingStates[`${rec.id}-Assist-Plan`]}
                      >
                        {uploadingStates[`${rec.id}-Assist-Plan`] ? (
                          <span className="rec-upload-spinner" />
                        ) : 'Upload Assist Plan'}
                      </button>
                    )}
                  </div>

                  {/* Progress Log */}
                  <div className="rec-upload-cell">
                    <input
                      type="file"
                      className="rec-file-input"
                      ref={(el) => { fileInputRefs.current[`${rec.id}-Progress-Log`] = el; }}
                      onChange={(e) => handleFileInputChange(rec.id, 'Progress-Log', e)}
                    />
                    {rec.progressLog ? (
                      <button
                        className="rec-file-btn uploaded progress-log"
                        onClick={() => handleViewFile(rec.progressLog.fileUrl)}
                        title="Open in Google Drive"
                      >
                        {rec.progressLog.fileName}
                      </button>
                    ) : (
                      <button
                        className="rec-file-btn upload progress-log"
                        onClick={() => triggerFileInput(rec.id, 'Progress-Log')}
                        disabled={uploadingStates[`${rec.id}-Progress-Log`]}
                      >
                        {uploadingStates[`${rec.id}-Progress-Log`] ? (
                          <span className="rec-upload-spinner" />
                        ) : 'Upload Progress Log'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Error Banner */}
              {rec.agencyId && (uploadErrors[`${rec.id}-Assist-Plan`] || uploadErrors[`${rec.id}-Progress-Log`]) && (
                <div className="rec-error-banner">
                  {uploadErrors[`${rec.id}-Assist-Plan`] && (
                    <p>Assist Plan: {uploadErrors[`${rec.id}-Assist-Plan`]}</p>
                  )}
                  {uploadErrors[`${rec.id}-Progress-Log`] && (
                    <p>Progress Log: {uploadErrors[`${rec.id}-Progress-Log`]}</p>
                  )}
                </div>
              )}

              {/* Row 4: Checkbox + OA Recommendation */}
              {rec.agencyId && (
                <div className="rec-action-row">
                  <label className="rec-checkbox-label">
                    <input
                      type="checkbox"
                      className="rec-checkbox"
                      checked={rec.progressLogFullyImplemented || false}
                      onChange={(e) => handleCheckboxChange(rec.id, e.target.checked)}
                    />
                    <span>Is &apos;Progress Log&apos; fully implemented?</span>
                  </label>
                  <button
                    className="rec-oa-btn"
                    onClick={() => console.log('OA Recommendation clicked for', rec.agencyName)}
                  >
                    OA Recommendation
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="rec-add-btn" onClick={handleAddAgency}>
          + Add Agency
        </button>
      </div>
    </main>
  );
}
