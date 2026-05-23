import React, { useState } from 'react';
import '../css/shared/deletion-requests.css';
import { auth } from '../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { useDeletionRequests } from '../hooks/useDeletionRequests';
import { updateDeletionRequest } from '../firebase/collections/deletionRequests';
import { deleteSubmission } from '../firebase/collections/agencySubmissions';
import { logActivity } from '../firebase/activityLog';
import { formatFirestoreDate } from '../utils/formatFirestoreDate';
import { authFetch, API_BASE_URL } from '../utils/apiClient';
import Modal from '../components/Modal';

export default function DeletionRequestsPage({ viewerRole }) {
  const { requests, loading } = useDeletionRequests({ status: ['pending', 'approved', 'rejected'] });
  const [filter, setFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const [notOwnerInfo, setNotOwnerInfo] = useState(null);

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const openActionModal = (req, action) => {
    setSelectedRequest(req);
    setModalAction(action);
    setModalStatus('');
    setNotOwnerInfo(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setModalAction(null);
    setModalStatus('');
    setNotOwnerInfo(null);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    setModalStatus('Deleting file from Google Drive...');

    try {
      const res = await authFetch('/approve-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: selectedRequest.fileId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.code === 'NOT_OWNER') {
          setNotOwnerInfo({
            location: errData.location || 'Unknown location',
            webViewLink: errData.webViewLink
          });
        }
        throw new Error(errData.error || 'Failed to delete file from Drive.');
      }

      /* Delete the agencySubmissions record */
      await deleteSubmission(selectedRequest.submissionId);

      /* Update deletion request */
      await updateDeletionRequest(selectedRequest.id, {
        status: 'approved',
        reviewedBy: auth.currentUser.uid,
        reviewerRole: viewerRole,
        reviewedAt: serverTimestamp()
      });

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: viewerRole,
        action: 'APPROVE_DELETION',
        targetAgencyName: selectedRequest.agencyName,
        details: { fileName: selectedRequest.fileName, fileType: selectedRequest.fileType, requestId: selectedRequest.id },
        message: `${viewerRole === 'admin' ? 'Admin' : 'CSC RO X'} approved deletion of ${selectedRequest.fileName} for ${selectedRequest.agencyName}`
      });

      setModalStatus('Deletion approved and file removed.');
      setTimeout(closeModal, 1500);
    } catch (err) {
      console.error('Approve error:', err);
      setModalStatus('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      await updateDeletionRequest(selectedRequest.id, {
        status: 'rejected',
        reviewedBy: auth.currentUser.uid,
        reviewerRole: viewerRole,
        reviewedAt: serverTimestamp()
      });

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: viewerRole,
        action: 'REJECT_DELETION',
        targetAgencyName: selectedRequest.agencyName,
        details: { fileName: selectedRequest.fileName, fileType: selectedRequest.fileType, requestId: selectedRequest.id },
        message: `${viewerRole === 'admin' ? 'Admin' : 'CSC RO X'} rejected deletion of ${selectedRequest.fileName} for ${selectedRequest.agencyName}`
      });

      setModalStatus('Deletion request rejected.');
      setTimeout(closeModal, 1500);
    } catch (err) {
      console.error('Reject error:', err);
      setModalStatus('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'status-badge pending';
      case 'approved': return 'status-badge approved';
      case 'rejected': return 'status-badge rejected';
      default: return 'status-badge';
    }
  };

  return (
    <main className="main-content">
      <div className="deletion-requests-header">
        <h1 id="deletion-requests-title">Deletion Requests</h1>
        <div className="deletion-filters">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="deletion-requests-container">
        {loading && <p>Loading deletion requests...</p>}

        {!loading && filteredRequests.length === 0 && (
          <div className="no-requests">
            <p>No {filter === 'all' ? '' : filter} deletion requests found.</p>
          </div>
        )}

        {!loading && filteredRequests.length > 0 && (
          <div className="deletion-table-wrapper">
            <table className="deletion-requests-table">
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.agencyName}</td>
                    <td>
                      <button 
                        className="link-btn"
                        onClick={async () => {
                          if (!req.fileId) return;
                          try {
                            const token = await auth.currentUser?.getIdToken();
                            window.open(`${API_BASE_URL}/file-proxy/${req.fileId}?token=${token}`, '_blank');
                          } catch (err) {
                            console.error('View error:', err);
                          }
                        }}
                      >
                        {req.fileName}
                      </button>
                    </td>
                    <td>{req.fileType}</td>
                    <td className="reason-cell">{req.reason}</td>
                    <td>
                      <span className={getStatusBadgeClass(req.status)}>
                        {req.status}
                      </span>
                    </td>
                    <td>{formatFirestoreDate(req.requestedAt)}</td>
                    <td>
                      {req.status === 'pending' && (
                        <div className="deletion-actions">
                          <button
                            className="approve-btn"
                            onClick={() => openActionModal(req, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => openActionModal(req, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status !== 'pending' && (
                        <span className="reviewed-label">
                          {req.reviewerRole === 'admin' ? 'By Admin' : 'By CSC RO X'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal && !!selectedRequest}
        onClose={closeModal}
        title={modalAction === 'approve' ? 'Approve Deletion' : 'Reject Deletion'}
        variant={modalAction === 'approve' ? 'danger' : 'warning'}
        className="deletion-action-modal"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={closeModal} disabled={isProcessing}>
              Cancel
            </button>
            {notOwnerInfo && notOwnerInfo.webViewLink ? (
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => window.open(notOwnerInfo.webViewLink, '_blank')}
              >
                Show in Drive
              </button>
            ) : (
              <button
                className={modalAction === 'approve' ? 'modal-btn modal-btn-danger' : 'modal-btn modal-btn-warning'}
                onClick={modalAction === 'approve' ? handleApprove : handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : (modalAction === 'approve' ? 'Confirm Delete' : 'Confirm Reject')}
              </button>
            )}
          </>
        }
      >
        <p className="action-file-name">
          <strong>File:</strong> {selectedRequest?.fileName}
        </p>
        <p className="action-agency-name">
          <strong>Agency:</strong> {selectedRequest?.agencyName}
        </p>
        <p className="action-reason">
          <strong>Reason:</strong> {selectedRequest?.reason}
        </p>
        {modalAction === 'approve' && !notOwnerInfo && (
          <p className="action-warning">
            ⚠️ This will permanently delete the file from Google Drive and remove the submission record.
          </p>
        )}
        {notOwnerInfo && (
          <div className="drive-notowner-path" style={{ marginTop: '12px' }}>
            <strong>Located in:</strong>{' '}
            <span>{notOwnerInfo.location}</span>
          </div>
        )}
        {modalStatus && (
          <p className={`action-status-msg ${modalStatus.includes('Error') ? 'error' : 'success'}`}>
            {modalStatus}
          </p>
        )}
      </Modal>
    </main>
  );
}
