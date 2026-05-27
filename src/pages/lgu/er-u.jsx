import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/er-u.css';
import uploadIcon from '../../assets/upload.svg';
import fileIcon from '../../assets/file.svg';
import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';
import { useAgencyWorkflow } from '../../hooks/useAgencyWorkflow';
import { useAgencyEvidenceUnlock } from '../../hooks/useAgencyEvidenceUnlock';
import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { createSubmission } from '../../firebase/collections/agencySubmissions';
import { useDeletionRequests } from '../../hooks/useDeletionRequests';
import { createDeletionRequest } from '../../firebase/collections/deletionRequests';
import { logActivity } from '../../firebase/activityLog';
import { createAdminNotifications } from '../../firebase/notifications';
import { authFetch } from '../../utils/apiClient';

export default function ERU() {
  const navigate = useNavigate();
  const { agencyName, submissions, loading, currentAssessmentYear } = useAgencyWorkflow();
  const { isUnlocked, lockedReason } = useAgencyEvidenceUnlock();
  const { requests: deletionRequests } = useDeletionRequests({ userId: auth.currentUser?.uid });

  const [showLockedModal, setShowLockedModal] = useState(false);
  const wasUnlockedRef = useRef(false);

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [statusType, setStatusType] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalStatusType, setModalStatusType] = useState('');

  /* Show modal if ER gets locked while user is on this page */
  useEffect(() => {
    if (wasUnlockedRef.current && !isUnlocked) {
      setShowLockedModal(true);
    }
    wasUnlockedRef.current = isUnlocked;
  }, [isUnlocked]);

  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);

  const evidenceSubmissions = submissions.filter(s => s.fileType === 'Evidence-Requirements');

  const assessmentYear = currentAssessmentYear || new Date().getFullYear().toString();

  const getDeletionStatus = (submissionId) => {
    const req = deletionRequests.find(r => r.submissionId === submissionId);
    return req ? req.status : null;
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
    e.target.value = null;
  };

  const processFiles = (selectedFiles) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const validFiles = selectedFiles.filter(f => validTypes.includes(f.type));
    const invalidFiles = selectedFiles.filter(f => !validTypes.includes(f.type));

    if (invalidFiles.length > 0) {
      setUploadStatus(`Skipped ${invalidFiles.length} invalid file(s). Only PDF and images are allowed.`);
      setStatusType('error');
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setUploadStatus('');
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!agencyName) {
      setUploadStatus('Agency Profile not found. Please complete your profile first.');
      setStatusType('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');
    setStatusType('');

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('agencyName', agencyName);
    formData.append('assessmentYear', String(assessmentYear));

    try {
      const response = await authFetch('/upload-evidence', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload failed.');
      }

      const data = await response.json();

      for (const uploaded of data.uploadedFiles) {
        await createSubmission({
          userId: auth.currentUser.uid,
          agencyName: agencyName,
          fileName: uploaded.fileName,
          fileId: uploaded.fileId,
          fileUrl: uploaded.webViewLink,
          fileType: 'Evidence-Requirements',
          uploadedAt: serverTimestamp(),
          assessmentYear: assessmentYear,
        });
      }

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: 'u',
        action: 'UPLOAD_FILE',
        targetAgencyName: agencyName,
        details: { fileName: files.map(f => f.name).join(', '), fileType: 'Evidence-Requirements', count: files.length },
        message: `Agency ${agencyName} uploaded ${files.length} Evidence Requirement file(s)`
      });

      await createAdminNotifications({
        type: 'EVIDENCE_UPLOAD',
        agencyId: auth.currentUser.uid,
        agencyName,
        fileName: files.length === 1 ? files[0].name : `${files.length} evidence files`
      });

      setFiles([]);
      setUploadStatus(`Successfully uploaded ${data.count} file(s).`);
      setStatusType('success');
    } catch (err) {
      console.error(err);
      setUploadStatus('Error: ' + err.message);
      setStatusType('error');
    } finally {
      setIsUploading(false);
    }
  };

  const openDeleteModal = (e, submission) => {
    e.stopPropagation();
    setSelectedFile(submission);
    setReason('');
    setModalStatus('');
    setModalStatusType('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedFile(null);
    setReason('');
  };

  const handleSubmitDelete = async () => {
    if (!reason.trim()) {
      setModalStatus('Please provide a reason for deletion.');
      setModalStatusType('error');
      return;
    }
    if (!selectedFile) return;

    setIsSubmitting(true);
    setModalStatus('');

    try {
      await createDeletionRequest({
        submissionId: selectedFile.id,
        userId: auth.currentUser.uid,
        agencyName: selectedFile.agencyName,
        fileName: selectedFile.fileName,
        fileId: selectedFile.fileId,
        fileType: selectedFile.fileType,
        reason: reason.trim(),
        status: 'pending',
        requestedAt: serverTimestamp()
      });

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: 'u',
        action: 'REQUEST_DELETION',
        targetAgencyName: selectedFile.agencyName,
        details: { fileName: selectedFile.fileName, fileType: selectedFile.fileType, reason: reason.trim() },
        message: `Agency ${selectedFile.agencyName} requested deletion of ${selectedFile.fileName}: ${reason.trim()}`
      });

      setModalStatus('Deletion request submitted successfully.');
      setModalStatusType('success');
      setTimeout(closeDeleteModal, 1500);
    } catch (err) {
      console.error('Deletion request error:', err);
      setModalStatus('Error: ' + err.message);
      setModalStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <main className="er-main-content">
      <div className="er-main-content-header">
        <h1 id="er-main-content-title">Evidence Requirements</h1>
      </div>

      <div className="er-content">
        <p className="er-description">
          Upload PDF or image files as evidence. Files are stored in your agency folder under <strong>{assessmentYear} &gt; Evidence Requirements</strong>.
        </p>

        {/* Upload Zone */}
        <div
          className={`er-upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <img src={uploadIcon} alt="Upload" width="40" height="40" className="deep-blue-filter" />
          <p className="er-upload-text">
            {isUploading ? 'Uploading...' : 'Drag & drop PDF or image files here, or click to browse'}
          </p>
          <p className="er-upload-hint">Allowed: PDF, JPG, JPEG, PNG</p>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="er-file-queue">
            <h4>Files ready to upload ({files.length})</h4>
            <div className="er-queue-list">
              {files.map((file, idx) => (
                <div key={idx} className="er-queue-item">
                  <span className="er-queue-name">{file.name}</span>
                  <button className="er-queue-remove" onClick={() => removeFile(idx)} disabled={isUploading}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button className="er-upload-btn" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? <Spinner size="sm" /> : `Upload ${files.length} File(s)`}
            </button>
          </div>
        )}

        {/* Status Message */}
        {uploadStatus && (
          <div className={`er-status-banner ${statusType}`}>{uploadStatus}</div>
        )}

        {/* Evidence Files Grid */}
        <div className="er-files-section">
          <h3 className="er-section-title">Your Evidence Files</h3>
          {evidenceSubmissions.length === 0 ? (
            <p className="er-empty">No evidence files uploaded yet.</p>
          ) : (
            <div className="er-file-grid">
              {evidenceSubmissions.map((sub) => {
                const delStatus = getDeletionStatus(sub.id);
                return (
                  <div key={sub.id} className="er-file-card">
                    <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="er-file-preview">
                      <img src={fileIcon} alt="File" className="er-file-icon" />
                      <span className="er-file-name">{sub.fileName}</span>
                    </a>
                    <div className="er-file-meta">
                      {delStatus ? (
                        <span className={`er-status-badge ${delStatus}`}>
                          {delStatus === 'pending' ? 'Deletion Pending' : delStatus === 'approved' ? 'Deletion Approved' : 'Deletion Rejected'}
                        </span>
                      ) : (
                        <button
                          className="er-delete-btn"
                          onClick={(e) => openDeleteModal(e, sub)}
                          disabled={!!delStatus}
                        >
                          Request Deletion
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deletion Request Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        title="Request Deletion"
        variant="warning"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={closeDeleteModal} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="modal-btn modal-btn-danger" onClick={handleSubmitDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Request Deletion'}
            </button>
          </>
        }
      >
        <div className="er-delete-form">
          <p>File: <strong>{selectedFile?.fileName}</strong></p>
          <label>Reason for deletion</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this file should be deleted..."
            disabled={isSubmitting}
          />
          {modalStatus && <p className={`er-modal-status ${modalStatusType}`}>{modalStatus}</p>}
        </div>
      </Modal>

      {/* Locked While On Page Modal */}
      <Modal
        isOpen={showLockedModal}
        onClose={() => {
          setShowLockedModal(false);
          navigate('/dashboard-u');
        }}
        title={lockedReason === 'oa-recommended' ? 'Onsite Assessment Recommended' : 'Evidence Requirements Disabled'}
        variant="warning"
        actions={
          <button className="modal-btn modal-btn-primary" onClick={() => {
            setShowLockedModal(false);
            navigate('/dashboard-u');
          }}>
            OK
          </button>
        }
      >
        <p>
          {lockedReason === 'oa-recommended'
            ? 'You have been recommended for Onsite Assessment.'
            : 'Evidence Requirements is no longer available.'}
        </p>
        <p className="modal-subtext" style={{ marginTop: '8px' }}>
          Evidence Requirements has been disabled. You will be redirected to your dashboard.
        </p>
      </Modal>
    </main>
  );
}
