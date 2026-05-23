import React, { useState } from 'react';
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
import { API_BASE_URL } from '../../utils/apiClient';

export default function Uview() {
  const { submissions, loading, error } = useAgencyWorkflow();
  const { requests: deletionRequests } = useDeletionRequests({ userId: auth.currentUser?.uid });
  const [showModal, setShowModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalStatusType, setModalStatusType] = useState('');

  const handleViewFile = async (file) => {
    if (!file?.fileId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const url = `${API_BASE_URL}/file-proxy/${file.fileId}`;
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to open file' }));
        alert(err.error || 'Failed to open file');
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
    } catch (err) {
      console.error('View file error:', err);
      alert('Failed to open file. Please try again.');
    }
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
      </div>

      {loading && (
        <div className="loading-container">
          <p>Fetching your documents...</p>
          <div className="loading-bar-background">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="no-files-found">
          <p style={{ color: '#cc0000' }}>Error: {error}</p>
        </div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="no-files-found">
          <p>No files found in the shared directory.</p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="current-files-found">
          {submissions.map((file) => {
            const delStatus = getDeletionStatus(file.id);
            return (
              <div
                key={file.id}
                className="file-block"
                onClick={() => handleViewFile(file)}
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
