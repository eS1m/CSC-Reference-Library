import { useState, useEffect, useRef } from 'react';
import '../../css/prime/recommendations-p.css';
import '../../css/prime/recom-p.css';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import Spinner from '../../components/Spinner';
import Modal from '../../components/Modal';
import GenerateModal from '../../components/GenerateModal';
import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { useRecommendations } from '../../hooks/useRecommendations';
import { updateRecommendation } from '../../firebase/collections/recommendations';
import { getSubmissions } from '../../firebase/collections/agencySubmissions';
import { unlockEvidence } from '../../firebase/collections/evidenceUnlocks';
import { createUserNotification } from '../../firebase/notifications';
import { authFetch } from '../../utils/apiClient';

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
  const [generatingStates, setGeneratingStates] = useState({});
  const [previewModal, setPreviewModal] = useState({ open: false, blobUrl: '', docxBlob: null, agencyName: '', recId: '' });
  const [collapsedCards, setCollapsedCards] = useState({});
  const [finishingStates, setFinishingStates] = useState({});
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
        oaRecommendedAt: null,
        assessmentFinished: false,
        assessmentFinishedAt: null,
        recommendationsFolderUrl: null
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

  const toggleCollapse = (recId) => {
    setCollapsedCards(prev => ({ ...prev, [recId]: !prev[recId] }));
  };

  const isAssessmentComplete = (rec) => {
    const selfAssessment = getLatestSubmission(submissionsByAgency, rec.agencyId, 'Self-Assessment');
    return !!(
      selfAssessment &&
      rec.evaluationCapabilityCard &&
      rec.fieldDirectorGuidepost &&
      rec.regionalDirectorGuidepost &&
      rec.narrativeReport
    );
  };

  const handleFinishAssessment = async (recId) => {
    const rec = recommendations.find(r => r.id === recId);
    if (!rec?.agencyName) return;

    setFinishingStates(prev => ({ ...prev, [recId]: true }));

    try {
      // Get Recommendations folder link
      const folderRes = await authFetch(
        `/drive/folder-link?agencyName=${encodeURIComponent(rec.agencyName)}&folderName=Recommendations`
      );
      const contentType = folderRes.headers.get('content-type') || '';
      let folderData;
      if (contentType.includes('application/json')) {
        folderData = await folderRes.json();
      } else {
        const text = await folderRes.text();
        throw new Error(`Server returned ${folderRes.status} (${folderRes.statusText}): ${text.slice(0, 200)}`);
      }
      if (!folderRes.ok) throw new Error(folderData.error || 'Failed to get folder link');

      // Update recommendation
      await updateRecommendation(recId, {
        assessmentFinished: true,
        assessmentFinishedAt: serverTimestamp(),
        recommendationsFolderUrl: folderData.folderUrl
      });

      // Notify agency
      await createUserNotification(rec.agencyId, {
        type: 'ASSESSMENT_FINISHED',
        title: 'Assessment Finished',
        message: `Your Field Office Monitoring assessment has been completed for ${new Date().getFullYear()}.`,
        agencyId: rec.agencyId,
        agencyName: rec.agencyName
      });

      // Collapse the card
      setCollapsedCards(prev => ({ ...prev, [recId]: true }));
    } catch (err) {
      console.error('Finish assessment error:', err);
      alert('Failed to finish assessment: ' + err.message);
    } finally {
      setFinishingStates(prev => ({ ...prev, [recId]: false }));
    }
  };

  const triggerFileInput = (recId, fileKey) => {
    const inputKey = `${recId}-${fileKey}`;
    fileInputRefs.current[inputKey]?.click();
  };

  const closePreviewModal = () => {
    if (previewModal.blobUrl) URL.revokeObjectURL(previewModal.blobUrl);
    setPreviewModal({ open: false, blobUrl: '', docxBlob: null, agencyName: '', recId: '' });
  };

  const handleUploadGeneratedReport = async () => {
    if (!previewModal.docxBlob || !previewModal.recId) return;

    const recId = previewModal.recId;
    const rec = recommendations.find(r => r.id === recId);
    if (!rec?.agencyName) return;

    const stateKey = `${recId}-narrative-report`;
    setUploadingStates(prev => ({ ...prev, [stateKey]: true }));
    setUploadErrors(prev => ({ ...prev, [stateKey]: '' }));

    const formData = new FormData();
    formData.append('file', previewModal.docxBlob, `Narrative Report-(${rec.agencyName}).docx`);
    formData.append('agencyName', rec.agencyName);
    formData.append('fileType', 'Narrative-Report');

    try {
      const response = await authFetch('/upload', {
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
        narrativeReport: fileData
      });

      closePreviewModal();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadErrors(prev => ({ ...prev, [stateKey]: err.message || 'Upload failed' }));
    } finally {
      setUploadingStates(prev => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleDownloadPreview = () => {
    if (!previewModal.docxBlob) return;
    saveAs(previewModal.docxBlob, `Narrative Report-(${previewModal.agencyName}).docx`);
  };

  const handleGenerateNarrativeReport = async (recId) => {
    const rec = recommendations.find(r => r.id === recId);
    if (!rec?.agencyName) return;

    const submission = getLatestSubmission(
      submissionsByAgency,
      rec.agencyId,
      'Self-Assessment'
    );

    if (!submission) {
      alert('Self-Assessment not found for this agency. Please ensure the agency has uploaded a Self-Assessment.');
      return;
    }

    setGeneratingStates(prev => ({ ...prev, [recId]: true }));

    try {
      const response = await authFetch('/generate-narrative-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName: rec.agencyName,
          selfAssessmentFileId: submission.fileId
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Generation failed');
      }

      const docxBlob = await response.blob();

      // Convert docx to HTML preview using mammoth
      const arrayBuffer = await docxBlob.arrayBuffer();
      const mammothResult = await mammoth.convertToHtml({ arrayBuffer });
      const rawHtml = mammothResult.value;

      const styledPreview = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              line-height: 1.6;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              background: #fff;
              color: #333;
              font-size: 11pt;
            }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; }
            td, th { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
            p { margin: 8px 0; }
            h1, h2, h3 { margin: 16px 0 8px; color: #1a365d; }
            ul, ol { margin: 8px 0; padding-left: 24px; }
            img { max-width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>${rawHtml}</body>
        </html>
      `;

      const htmlBlob = new Blob([styledPreview], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(htmlBlob);

      setPreviewModal({
        open: true,
        blobUrl,
        docxBlob,
        agencyName: rec.agencyName,
        recId
      });
    } catch (err) {
      console.error('Generation error:', err);
      setUploadErrors(prev => ({ ...prev, [`${recId}-narrative-report`]: err.message || 'Generation failed' }));
    } finally {
      setGeneratingStates(prev => ({ ...prev, [recId]: false }));
    }
  };

  const handleFileUpload = async (recId, fileConfig, file) => {
    if (!file) return;

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

    if (fileConfig.key === 'narrative-report' && !storedFile) {
      return (
        <div className="recom-upload-slot">
          <input
            type="file"
            className="rec-file-input"
            accept={fileConfig.accept}
            ref={(el) => { fileInputRefs.current[stateKey] = el; }}
            onChange={(e) => handleFileInputChange(rec.id, fileConfig, e)}
          />
          <button
            type="button"
            className="generate-preview-btn"
            onClick={() => handleGenerateNarrativeReport(rec.id)}
            disabled={generatingStates[rec.id] || isUploading}
          >
            {generatingStates[rec.id] ? (
              <Spinner size="xs" color="primary" />
            ) : 'Generate'}
          </button>
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
        </div>
      );
    }

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

              const isFinished = rec.assessmentFinished === true;
              const isComplete = isAssessmentComplete(rec);
              const isCollapsed = collapsedCards[rec.id] ?? isFinished;

              return (
                <div key={rec.id} className={`rec-card recom-card${isFinished ? ' finished' : ''}${isCollapsed ? ' collapsed' : ''}`}>
                  <div className="recom-card-header">
                    <div className="recom-card-title">
                      <h2 className="recom-agency-name">{rec.agencyName}</h2>
                      {rec.fieldDirector && (
                        <p className="recom-agency-director">Field Director: {rec.fieldDirector}</p>
                      )}
                      {isFinished && (
                        <span className="recom-finished-badge">Assessment Complete</span>
                      )}
                    </div>
                    <div className="recom-header-actions">
                      <button
                        type="button"
                        className="recom-collapse-btn"
                        onClick={() => toggleCollapse(rec.id)}
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                      >
                        {isCollapsed ? '▼' : '▲'}
                      </button>
                      <button
                        type="button"
                        className="recom-undo-btn"
                        onClick={() => handleUndoRecommend(rec.id)}
                        title="Undo this recommendation and unlock the card"
                      >
                        Undo Recommendation
                      </button>
                    </div>
                  </div>

                  {rec.recommendationsFolderUrl && (
                    <div className="recom-folder-link">
                      <a
                        href={rec.recommendationsFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Recommendations Folder →
                      </a>
                    </div>
                  )}

                  <div className={`recom-card-body${isCollapsed ? ' collapsed' : ''}`}>
                    <div className="rec-upload-row recom-files-row">
                      {COMPILED_FILES.map(fileConfig => (
                        <div key={fileConfig.key} className="rec-upload-cell recom-file-cell">
                          <span className="recom-file-label">{fileConfig.label}</span>
                          {isFinished ? (
                            <div className="recom-file-locked">
                              {fileConfig.source === 'submission' ? (
                                (() => {
                                  const submission = getLatestSubmission(submissionsByAgency, rec.agencyId, fileConfig.submissionType);
                                  return submission ? (
                                    <button
                                      type="button"
                                      className="rec-file-btn uploaded"
                                      onClick={() => handleViewFile(getDriveUrl(submission.fileId, submission.fileUrl))}
                                    >
                                      {submission.fileName}
                                    </button>
                                  ) : (
                                    <span className="recom-locked-label">Not available</span>
                                  );
                                })()
                              ) : rec[fileConfig.field] ? (
                                <button
                                  type="button"
                                  className="rec-file-btn uploaded"
                                  onClick={() => handleViewFile(getDriveUrl(rec[fileConfig.field].fileId, rec[fileConfig.field].fileUrl))}
                                >
                                  {rec[fileConfig.field].fileName}
                                </button>
                              ) : (
                                <span className="recom-locked-label">Not uploaded</span>
                              )}
                            </div>
                          ) : (
                            renderFileSlot(rec, fileConfig)
                          )}
                        </div>
                      ))}
                    </div>

                    {isComplete && !isFinished && (
                      <div className="recom-finish-row">
                        <button
                          type="button"
                          className="recom-finish-btn"
                          onClick={() => handleFinishAssessment(rec.id)}
                          disabled={finishingStates[rec.id]}
                        >
                          {finishingStates[rec.id] ? (
                            <Spinner size="sm" color="white" />
                          ) : (
                            'Finish Assessment'
                          )}
                        </button>
                      </div>
                    )}

                    {recErrors.length > 0 && (
                      <div className="rec-error-banner">
                        {recErrors.map(({ label, message }) => (
                          <p key={label}>{label}: {message}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GenerateModal
        isOpen={previewModal.open}
        onClose={closePreviewModal}
        title={`Narrative Report Preview — ${previewModal.agencyName || ''}`}
        blobUrl={previewModal.blobUrl}
        onDownload={handleDownloadPreview}
        onUpload={handleUploadGeneratedReport}
        isUploading={uploadingStates[`${previewModal.recId}-narrative-report`]}
        uploadError={uploadErrors[`${previewModal.recId}-narrative-report`] || ''}
        downloadDisabled={!previewModal.docxBlob}
        uploadDisabled={!previewModal.docxBlob}
      />
    </main>
  );
}
