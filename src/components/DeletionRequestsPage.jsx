import React, { useState, useEffect } from 'react';
import '../css/shared/deletion-requests.css';
import { db, auth } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../firebase/activityLog';
import { formatFirestoreDate } from '../utils/formatFirestoreDate';
import closeIcon from '../assets/close.svg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DeletionRequestsPage({ viewerRole }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalStatus, setModalStatus] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'deletionRequests'),
      where('status', 'in', ['pending', 'approved', 'rejected'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = [];
      snap.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() }));
      data.sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      setRequests(data);
      setLoading(false);
    }, (err) => {
      console.error('Deletion requests listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const openActionModal = (req, action) => {
    setSelectedRequest(req);
    setModalAction(action);
    setModalStatus('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setModalAction(null);
    setModalStatus('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    setModalStatus('Deleting file from Google Drive...');

    try {
      const res = await fetch(`${API_URL}/approve-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: selectedRequest.fileId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete file from Drive.');
      }

      /* Delete the agencySubmissions record */
      await deleteDoc(doc(db, 'agencySubmissions', selectedRequest.submissionId));

      /* Update deletion request */
      await updateDoc(doc(db, 'deletionRequests', selectedRequest.id), {
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
      await updateDoc(doc(db, 'deletionRequests', selectedRequest.id), {
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
                        onClick={() => window.open(`https://drive.google.com/file/d/${req.fileId}/view`, '_blank')}
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

      {/* ACTION MODAL */}
      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content deletion-action-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalAction === 'approve' ? 'Approve Deletion' : 'Reject Deletion'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <img src={closeIcon} alt="Close" width="20" height="20"/>
              </button>
            </div>

            <div className="modal-body">
              <p className="action-file-name">
                <strong>File:</strong> {selectedRequest.fileName}
              </p>
              <p className="action-agency-name">
                <strong>Agency:</strong> {selectedRequest.agencyName}
              </p>
              <p className="action-reason">
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
              {modalAction === 'approve' && (
                <p className="action-warning">
                  ⚠️ This will permanently delete the file from Google Drive and remove the submission record.
                </p>
              )}
              {modalStatus && (
                <p className={`action-status-msg ${modalStatus.includes('Error') ? 'error' : 'success'}`}>
                  {modalStatus}
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button className="cancel-btn" onClick={closeModal} disabled={isProcessing}>
                Cancel
              </button>
              <button
                className={modalAction === 'approve' ? 'approve-btn' : 'reject-btn'}
                onClick={modalAction === 'approve' ? handleApprove : handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : (modalAction === 'approve' ? 'Confirm Delete' : 'Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
