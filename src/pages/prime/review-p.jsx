import '../../css/prime/review-p.css';
import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase/config';
import { logActivity } from '../../firebase/activityLog';
import { formatFirestoreDate } from '../../utils/formatFirestoreDate';
import Spinner from '../../components/Spinner';
import { subscribeSubmissions, updateSubmission } from '../../firebase/collections/agencySubmissions';

import fileIcon from '../../assets/file.svg';
import approveIcon from '../../assets/approved.svg';
import rejectIcon from '../../assets/rejected.svg';
import viewIcon from '../../assets/view.svg';
import downloadIcon from '../../assets/download.svg';
import Modal from '../../components/Modal';

export default function Preview() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* Fetch ALL pending submissions */
  useEffect(() => {
    setLoading(true);

    const unsubscribe = subscribeSubmissions(
      { fileType: 'Self-Assessment', status: 'Pending' },
      (data) => {
        const sorted = [...data].sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
        setSubmissions(sorted);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching submissions:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (fileId, newStatus) => {
    setActionLoading(true);
    try {
      await updateSubmission(fileId, {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: auth.currentUser?.uid || 'unknown',
        reviewerEmail: auth.currentUser?.email || 'unknown'
      });

      await logActivity({
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        userRole: 'p',
        action: newStatus === 'Approved' ? 'APPROVE_FILE' : 'REJECT_FILE',
        targetUserId: selectedFile.userId,
        targetAgencyName: selectedFile.agencyName,
        details: {
          fileName: selectedFile.fileName,
          fileType: selectedFile.fileType,
          submissionId: fileId,
        },
        message: `PRIME officer ${auth.currentUser?.email || 'unknown'} ${newStatus.toLowerCase()} ${selectedFile.fileType} for ${selectedFile.agencyName}`
      });

      setSelectedFile(null); // Close modal on success
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleView = (fileUrl) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      alert("File URL not available.");
    }
  };

  const handleDownload = (fileId, fileName) => {
    if (!fileId) {
      alert("File ID not available.");
      return;
    }
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeModal = () => {
    if (!actionLoading) setSelectedFile(null);
  };

  return (
    <main className="view-main-content">
      <div className="pending-header">
        <h1>Review Submissions</h1>
        <div className="pending-count">
          <p className="submission-number">{submissions.length}</p>
          <p>pending</p>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-container">
          <p>Fetching pending submissions...</p>
          <div className="loading-bar-background">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && submissions.length === 0 && (
        <div className="no-files-found">
          <p>No pending submissions to review.</p>
        </div>
      )}

      {/* File Grid — cards are compact, click opens modal */}
      {!loading && submissions.length > 0 && (
        <div className="current-files-found">
          {submissions.map((file) => (
            <div 
              key={file.id} 
              className="file-block review-card"
              onClick={() => setSelectedFile(file)}
            >
              <img src={fileIcon} alt="File" width="80" height="80" className="deep-blue-filter"/>
              <p className="file-name">{file.fileName}</p>
              <p className="agency-name">{file.agencyName}</p>
              
              <span className={`status-badge ${(file.status || 'Pending').toLowerCase()}`}>
                {file.status || 'Pending'}
              </span>

              <button className="review-trigger-btn">
                Review Submission
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedFile}
        onClose={closeModal}
        title="Review Submission"
        hideIcon
        actions={
          <>
            <div className="action-row file-actions">
              <button
                className="view-btn"
                onClick={() => handleView(selectedFile.fileUrl)}
                disabled={actionLoading}
              >
                <img src={viewIcon} alt="View" width="16" height="16"/>
                View in Drive
              </button>
              <button
                className="download-btn"
                onClick={() => handleDownload(selectedFile.fileId, selectedFile.fileName)}
                disabled={actionLoading}
              >
                <img src={downloadIcon} alt="Download" width="16" height="16"/>
                Download
              </button>
            </div>
            <div className="action-row decision-actions">
              <button
                className="approve-btn"
                onClick={() => handleStatusChange(selectedFile.id, 'Approved')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <img src={approveIcon} alt="Approve" width="16" height="16"/>
                )}
                {actionLoading ? 'Processing...' : 'Approve Submission'}
              </button>
              <button
                className="reject-btn"
                onClick={() => handleStatusChange(selectedFile.id, 'Rejected')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Spinner size="xs" color="white" />
                ) : (
                  <img src={rejectIcon} alt="Reject" width="16" height="16"/>
                )}
                {actionLoading ? 'Processing...' : 'Reject Submission'}
              </button>
            </div>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
          <div className="modal-file-icon">
            <img src={fileIcon} alt="File" width="100" height="100" className="deep-blue-filter"/>
          </div>
          <div className="modal-details">
            <div className="detail-row">
              <span className="detail-label">Agency:</span>
              <span className="detail-value">{selectedFile?.agencyName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">File Name:</span>
              <span className="detail-value">{selectedFile?.fileName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">File Type:</span>
              <span className="detail-value">{selectedFile?.fileType}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Submitted:</span>
              <span className="detail-value">
                {formatFirestoreDate(selectedFile?.uploadedAt, { includeTime: true })}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className={`status-badge ${(selectedFile?.status || 'Pending').toLowerCase()}`}>
                {selectedFile?.status || 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}