import React, { useState, useEffect } from 'react';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uview.css';

import fileIcon from '../../assets/file.svg';
import closeIcon from '../../assets/close.svg';
import { useAgencyData } from '../../hooks/useAgencyData';
import { auth, db } from '../../firebase/config';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../../firebase/activityLog';

export default function Uview() {
  const { submissions, loading, error } = useAgencyData();
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [modalStatusType, setModalStatusType] = useState('');

  /* Listen to user's deletion requests */
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'deletionRequests'),
      where('userId', '==', auth.currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const reqs = [];
      snap.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
      setDeletionRequests(reqs);
    });
    return () => unsub();
  }, []);

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
      await addDoc(collection(db, 'deletionRequests'), {
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

      {/* REQUEST DELETION MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content deletion-request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Deletion</h2>
              <button className="modal-close" onClick={closeModal}>
                <img src={closeIcon} alt="Close" width="20" height="20"/>
              </button>
            </div>

            <div className="modal-body">
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
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="submit-request-btn"
                onClick={handleSubmitRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
