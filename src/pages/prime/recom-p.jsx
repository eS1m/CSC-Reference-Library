import { useState, useEffect, useRef } from 'react';
import '../../css/prime/recommendations-p.css';
import '../../css/prime/recom-p.css';
import Spinner from '../../components/Spinner';
import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { useRecommendations } from '../../hooks/useRecommendations';
import { updateRecommendation } from '../../firebase/collections/recommendations';
import { getSubmissions } from '../../firebase/collections/agencySubmissions';
import { unlockEvidence } from '../../firebase/collections/evidenceUnlocks';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const EXCEL_ACCEPT = '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
const WORD_ACCEPT = '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword';

const COMPILED_FILES = [
  {
    key: 'self-assessment',
    label: 'Self-Assessment of the Agency',
    source: 'submission',
    submissionType: 'Self-Assessment',
    uploadLabel: 'Self-Assessment not found',
  },
  {
    key: 'evaluation-capability',
    label: 'Agency Evaluation Capability Card',
    field: 'evaluationCapabilityCard',
    uploadFileType: 'Evaluation-Capability-Card',
    uploadLabel: 'Upload Capability Card (.xlsx)',
    accept: EXCEL_ACCEPT,
  },
  {
    key: 'field-director-guidepost',
    label: 'Guidepost of the Field Director',
    field: 'fieldDirectorGuidepost',
    uploadFileType: 'Field-Director-Guidepost',
    uploadLabel: 'Upload Field Director Guidepost (.xlsx)',
    accept: EXCEL_ACCEPT,
  },
  {
    key: 'regional-director-guidepost',
    label: 'Guidepost of the Regional Director',
    field: 'regionalDirectorGuidepost',
    uploadFileType: 'Regional-Director-Guidepost',
    uploadLabel: 'Upload Regional Director Guidepost (.docx)',
    accept: WORD_ACCEPT,
    accent: 'progress-log',
  },
  {
    key: 'narrative-report',
    label: 'Narrative Report',
    field: 'narrativeReport',
    uploadFileType: 'Narrative-Report',
    uploadLabel: 'Upload Narrative Report',
    pending: true,
    pendingLabel: 'Template pending — upload not available yet',
  },
];

function getDriveUrl(fileId, fileUrl) {
  if (fileUrl) return fileUrl;
  if (fileId) return `https://drive.google.com/file/d/${fileId}/view`;
  return null;
}

function getLatestSubmission(submissionsByAgency, agencyId, fileType) {
  const matches = (submissionsByAgency[agencyId] || [])
    .filter(s => s.fileType === fileType);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => {
    const aTime = a.uploadedAt?.toMillis?.() ?? a.uploadedAt?.seconds ?? 0;
    const bTime = b.uploadedAt?.toMillis?.() ?? b.uploadedAt?.seconds ?? 0;
    return bTime - aTime;
  })[0];
}

export default function RecomP() {
  const { recommendations, loading } = useRecommendations();
  const [submissionsByAgency, setSubmissionsByAgency] = useState({});
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [uploadingStates, setUploadingStates] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const fileInputRefs = useRef({});

  const recommendedAgencies = recommendations
    .filter(r => r.oaRecommended && r.agencyName)
    .sort((a, b) => (a.agencyName || '').localeCompare(b.agencyName || ''));

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const allSubmissions = await getSubmissions({ orderByField: 'uploadedAt', orderDirection: 'desc' });
        const byAgency = {};
        allSubmissions.forEach(sub => {
          if (!byAgency[sub.userId]) byAgency[sub.userId] = [];
          byAgency[sub.userId].push(sub);
        });
        setSubmissionsByAgency(byAgency);
      } catch (err) {
        console.error('Error fetching submissions for recommendations:', err);
      } finally {
        setSubmissionsLoading(false);
      }
    }

    fetchSubmissions();
  }, []);

  const handleUndoRecommend = async (recId) => {
    const rec = recommendations.find(r => r.id === recId);
    try {
      await updateRecommendation(recId, {
        oaRecommended: false,
        oaRecommendedAt: null
      });
      // Re-unlock Evidence Requirements for this agency
      if (rec?.agencyId) {
        await unlockEvidence(rec.agencyId);
      }
    } catch (err) {
      console.error('Error undoing recommendation:', err);
      alert('Failed to undo recommendation: ' + err.message);
    }
  };

  const triggerFileInput = (recId, fileKey) => {
    const inputKey = `${recId}-${fileKey}`;
    fileInputRefs.current[inputKey]?.click();
  };

  const handleFileUpload = async (recId, fileConfig, file) => {
    if (!file || fileConfig.pending) return;

    const rec = recommendations.find(r => r.id === recId);
    if (!rec?.agencyName) return;

    const stateKey = `${recId}-${fileConfig.key}`;
    setUploadingStates(prev => ({ ...prev, [stateKey]: true }));
    setUploadErrors(prev => ({ ...prev, [stateKey]: '' }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agencyName', rec.agencyName);
    formData.append('fileType', fileConfig.uploadFileType);

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

      await updateRecommendation(recId, {
        [fileConfig.field]: fileData
      });
    } catch (err) {
      console.error('Upload error:', err);
      setUploadErrors(prev => ({ ...prev, [stateKey]: err.message || 'Upload failed' }));
    } finally {
      setUploadingStates(prev => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleFileInputChange = (recId, fileConfig, e) => {
    const file = e.target.files[0];
    e.target.value = null;
    if (file) {
      handleFileUpload(recId, fileConfig, file);
    }
  };

  const handleViewFile = (url) => {
    if (url) window.open(url, '_blank');
  };

  const renderUploadedFile = (rec, fileConfig, fileData, stateKey) => {
    const accentClass = fileConfig.accent ? ` ${fileConfig.accent}` : '';
    const viewUrl = getDriveUrl(fileData.fileId, fileData.fileUrl);

    return (
      <>
        <button
          type="button"
          className={`rec-file-btn uploaded${accentClass}`}
          onClick={() => handleViewFile(viewUrl)}
          title="Open in Google Drive"
        >
          {fileData.fileName}
        </button>
        {!fileConfig.pending && (
          <button
            type="button"
            className="rec-change-file-btn"
            onClick={() => triggerFileInput(rec.id, fileConfig.key)}
            disabled={uploadingStates[stateKey]}
          >
            {uploadingStates[stateKey] ? (
              <Spinner size="sm" color="primary" />
            ) : 'Change file'}
          </button>
        )}
      </>
    );
  };

  const renderFileSlot = (rec, fileConfig) => {
    const stateKey = `${rec.id}-${fileConfig.key}`;
    const isUploading = uploadingStates[stateKey];

    if (fileConfig.pending) {
      return (
        <button type="button" className="rec-file-btn upload" disabled title={fileConfig.pendingLabel}>
          {fileConfig.pendingLabel}
        </button>
      );
    }

    if (fileConfig.source === 'submission') {
      const submission = getLatestSubmission(
        submissionsByAgency,
        rec.agencyId,
        fileConfig.submissionType
      );

      if (submissionsLoading) {
        return (
          <button type="button" className="rec-file-btn upload" disabled>
            <Spinner size="sm" color="primary" />
          </button>
        );
      }

      if (submission) {
        const viewUrl = getDriveUrl(submission.fileId, submission.fileUrl);
        return (
          <button
            type="button"
            className="rec-file-btn uploaded"
            onClick={() => handleViewFile(viewUrl)}
            title="Open agency Self-Assessment in Google Drive"
          >
            {submission.fileName}
          </button>
        );
      }

      return (
        <button type="button" className="rec-file-btn upload" disabled>
          {fileConfig.uploadLabel}
        </button>
      );
    }

    const storedFile = rec[fileConfig.field];

    return (
      <div className="recom-upload-slot">
        <input
          type="file"
          className="rec-file-input"
          accept={fileConfig.accept}
          ref={(el) => { fileInputRefs.current[stateKey] = el; }}
          onChange={(e) => handleFileInputChange(rec.id, fileConfig, e)}
        />
        {storedFile ? (
          renderUploadedFile(rec, fileConfig, storedFile, stateKey)
        ) : (
          <button
            type="button"
            className={`rec-file-btn upload${fileConfig.accent ? ` ${fileConfig.accent}` : ''}`}
            onClick={() => triggerFileInput(rec.id, fileConfig.key)}
            disabled={isUploading}
          >
            {isUploading ? (
              <Spinner size="sm" color="primary" />
            ) : fileConfig.uploadLabel}
          </button>
        )}
      </div>
    );
  };

  const pageLoading = loading || submissionsLoading;

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Recommendations</h1>
      </div>

      <div className="recom-page">
        {pageLoading && (
          <div className="recom-loading">
            <Spinner size="lg" color="primary" />
            <span>Loading recommendations...</span>
          </div>
        )}

        {!pageLoading && recommendedAgencies.length === 0 && (
          <p className="recom-empty">No OA-recommended agencies yet.</p>
        )}

        {!pageLoading && recommendedAgencies.length > 0 && (
          <div className="rec-cards recom-cards">
            {recommendedAgencies.map(rec => {
              const recErrors = COMPILED_FILES
                .filter(f => !f.source && !f.pending && uploadErrors[`${rec.id}-${f.key}`])
                .map(f => ({
                  label: f.label,
                  message: uploadErrors[`${rec.id}-${f.key}`]
                }));

              return (
                <div key={rec.id} className="rec-card recom-card">
                  <div className="recom-card-header">
                    <div className="recom-card-title">
                      <h2 className="recom-agency-name">{rec.agencyName}</h2>
                      {rec.fieldDirector && (
                        <p className="recom-agency-director">Field Director: {rec.fieldDirector}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="recom-undo-btn"
                      onClick={() => handleUndoRecommend(rec.id)}
                      title="Debug: Undo this recommendation and unlock the card"
                    >
                      Undo Recommendation
                    </button>
                  </div>

                  <div className="rec-upload-row recom-files-row">
                    {COMPILED_FILES.map(fileConfig => (
                      <div key={fileConfig.key} className="rec-upload-cell recom-file-cell">
                        <span className="recom-file-label">{fileConfig.label}</span>
                        {renderFileSlot(rec, fileConfig)}
                      </div>
                    ))}
                  </div>

                  {recErrors.length > 0 && (
                    <div className="rec-error-banner">
                      {recErrors.map(({ label, message }) => (
                        <p key={label}>{label}: {message}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
