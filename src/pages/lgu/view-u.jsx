import React, { useState, useEffect, useMemo } from 'react';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uview.css';

import fileIcon from '../../assets/file.svg';
import Modal from '../../components/Modal';
import { useAgencyWorkflow } from '../../hooks/useAgencyWorkflow';
import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { useDeletionRequests } from '../../hooks/useDeletionRequests';
import { createDeletionRequest } from '../../firebase/collections/deletionRequests';
import { logActivity } from '../../firebase/activityLog';
import { authFetch } from '../../utils/apiClient';

export default function Uview() {
  const { submissions, loading, error, currentAssessmentYear } = useAgencyWorkflow();
  const { requests: deletionRequests } = useDeletionRequests({ userId: auth.currentUser?.uid });
  const [selectedYear, setSelectedYear] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalStatusType, setModalStatusType] = useState('');
  const [verifiedFiles, setVerifiedFiles] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    async function verifyFiles() {
      if (submissions.length === 0) return;
      const fileIds = submissions
        .map(s => s.fileId)
        .filter(Boolean);
      if (fileIds.length === 0) return;

      setVerifying(true);
      setVerifyError('');
      try {
        const res = await authFetch('/drive/verify-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to verify files');
        }
        setVerifiedFiles(data.exists || {});
      } catch (err) {
        console.error('File verification error:', err);
        setVerifyError('Could not verify file availability. Showing all files.');
        setVerifiedFiles({});
      } finally {
        setVerifying(false);
      }
    }

    verifyFiles();
  }, [submissions]);

  const availableYears = useMemo(() => {
    const years = new Set();
    submissions.forEach((s) => {
      if (s.assessmentYear != null) years.add(String(s.assessmentYear));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [submissions]);

  const visibleSubmissions = useMemo(() => {
    if (Object.keys(verifiedFiles).length === 0) return submissions;
    return submissions.filter((s) => {
      if (!s.fileId) return true;
      return verifiedFiles[s.fileId] === true;
    });
  }, [submissions, verifiedFiles]);

  const filteredSubmissions = useMemo(() => {
    if (selectedYear === 'all') return visibleSubmissions;
    return visibleSubmissions.filter((s) => String(s.assessmentYear) === selectedYear);
  }, [visibleSubmissions, selectedYear]);

  const getDriveUrl = (file) => {
    if (!file) return '#';
    if (file.fileId) {
      return `https://drive.google.com/file/d/${file.fileId}/view`;
    }
    return file.fileUrl || '#';
  };

  const getDeletionStatus = (submissionId) => {
    const req = deletionRequests.find(r => r.submissionId === submissionId);
    return req ? req.status : null;
  };

  const openRequestModal = (e, submission) => {
    e.stopPropagation();
    setSelectedSubmission(submission);
    setReason('');
    setModalStatus('');
    setModalStatusType('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSubmission(null);
    setReason('');
    setModalStatus('');
  };

  const handleSubmitRequest = async () => {
    if (!reason.trim()) {
      setModalStatus('Please provide a reason for deletion.');
      setModalStatusType('error');
      return;
    }
    if (!selectedSubmission) return;

    setIsSubmitting(true);
    setModalStatus('');

    try {
      await createDeletionRequest({
        submissionId: selectedSubmission.id,
        userId: auth.currentUser.uid,
        agencyName: selectedSubmission.agencyName,
        fileName: selectedSubmission.fileName,
        fileId: selectedSubmission.fileId,
        fileType: selectedSubmission.fileType,
        reason: reason.trim(),
        status: 'pending',
        requestedAt: serverTimestamp()
      });

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: 'u',
        action: 'REQUEST_DELETION',
        targetAgencyName: selectedSubmission.agencyName,
        details: { fileName: selectedSubmission.fileName, fileType: selectedSubmission.fileType, reason: reason.trim() },
        message: `Agency ${selectedSubmission.agencyName} requested deletion of ${selectedSubmission.fileName}: ${reason.trim()}`
      });

      setModalStatus('Deletion request submitted successfully.');
      setModalStatusType('success');
      setTimeout(closeModal, 1500);
    } catch (err) {
      console.error('Deletion request error:', err);
      setModalStatus('Error: ' + err.message);
      setModalStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="view-main-content">
      <div className="view-header">
        <h1>View Your Files</h1>
        {availableYears.length > 0 && (
          <div className="year-selector">
            <label htmlFor="year-filter">Assessment Year:</label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {(loading || verifying) && (
        <div className="loading-container">
          <p>{verifying ? 'Verifying file availability...' : 'Fetching your documents...'}</p>
          <div className="loading-bar-background">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      )}

      {(error || verifyError) && !loading && !verifying && (
        <div className="no-files-found">
          {error && <p style={{ color: '#cc0000' }}>Error: {error}</p>}
          {verifyError && <p style={{ color: '#e67e22' }}>{verifyError}</p>}
        </div>
      )}

      {!loading && !error && filteredSubmissions.length === 0 && (
        <div className="no-files-found">
          <p>No files found in the shared directory.</p>
        </div>
      )}

      {!loading && !error && filteredSubmissions.length > 0 && (
        <div className="current-files-found">
          {filteredSubmissions.map((file) => {
            const delStatus = getDeletionStatus(file.id);
            return (
              <div
                key={file.id}
                className="file-block"
                onClick={() => window.open(getDriveUrl(file), '_blank')}
              >
                <img src={fileIcon} alt="File" width="80" height="80" className="deep-blue-filter"/>
                <p>{file.fileName}</p>
                
                {delStatus && (
                  <span className={`deletion-badge ${delStatus}`}>
                    Deletion {delStatus}
                  </span>
                )}

                {!delStatus && (
                  <button
                    className="request-delete-btn"
                    onClick={(e) => openRequestModal(e, file)}
                  >
                    Request Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Request Deletion"
        className="deletion-request-modal"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-danger"
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </>
        }
      >
        <p className="deletion-file-name">
          <strong>File:</strong> {selectedSubmission?.fileName}
        </p>
        <label htmlFor="deletion-reason" className="deletion-reason-label">
          Reason for deletion <span className="required">*</span>
        </label>
        <textarea
          id="deletion-reason"
          className="deletion-reason-input"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this file should be deleted..."
        />
        {modalStatus && (
          <p className={`deletion-status-msg ${modalStatusType}`}>{modalStatus}</p>
        )}
      </Modal>
    </main>
  );
}
