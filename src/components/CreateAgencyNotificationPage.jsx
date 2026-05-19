import { useState, useEffect } from 'react';
import '../css/shared/create-agency-notification.css';
import '../css/prime/recommendations-p.css';
import Spinner from './Spinner';
import Modal from './Modal';
import { auth } from '../firebase/config';
import { getUsers } from '../firebase/collections/users';
import { getProfiles } from '../firebase/collections/agencyProfiles';
import { createUserNotification } from '../firebase/notifications';

export default function CreateAgencyNotificationPage({ viewerRole }) {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agencyId, setAgencyId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [sentAgencyName, setSentAgencyName] = useState('');

  useEffect(() => {
    async function loadAgencies() {
      try {
        const [users, profiles] = await Promise.all([getUsers(), getProfiles()]);
        const profileById = Object.fromEntries(profiles.map(p => [p.id, p]));

        const agencyList = users
          .filter(u => u.role === 'u')
          .filter(u => !u.approvalStatus || u.approvalStatus === 'approved')
          .map(u => ({
            id: u.id,
            email: u.email,
            name: profileById[u.id]?.agencyDetails?.agencyName?.trim() || u.email || 'Unknown Agency'
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setAgencies(agencyList);
      } catch (err) {
        console.error('Error loading agencies:', err);
        setError('Failed to load agency list. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    loadAgencies();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agencyId) {
      setError('Please select an agency.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a notification message.');
      return;
    }

    const agency = agencies.find(a => a.id === agencyId);
    setSending(true);

    try {
      await createUserNotification(agencyId, {
        type: 'MANUAL_NOTIFICATION',
        title: title.trim() || 'Notification',
        message: message.trim(),
        agencyId,
        agencyName: agency?.name || null
      });

      setSentAgencyName(agency?.name || 'the selected agency');
      setShowSuccess(true);
      setAgencyId('');
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const senderLabel = viewerRole === 'admin' ? 'System Administrator' : 'CSC RO X';

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Send Agency Notification</h1>
      </div>

      <div className="can-page">
        {loading && (
          <div className="can-loading">
            <Spinner size="lg" color="primary" />
            <span>Loading agencies...</span>
          </div>
        )}

        {!loading && agencies.length === 0 && (
          <p className="can-empty">No approved agency accounts are available.</p>
        )}

        {!loading && agencies.length > 0 && (
          <form className="can-form rec-card" onSubmit={handleSubmit}>
            <p className="can-form-intro">
              Send a custom in-app notification to a specific agency. The agency will see it in their notification bell.
            </p>

            <div className="rec-row">
              <label className="rec-label" htmlFor="can-agency">Agency</label>
              <select
                id="can-agency"
                className="rec-select"
                value={agencyId}
                onChange={(e) => setAgencyId(e.target.value)}
                disabled={sending}
                required
              >
                <option value="">Select an agency...</option>
                {agencies.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div className="rec-row">
              <label className="rec-label" htmlFor="can-title">Title</label>
              <input
                id="can-title"
                type="text"
                className="rec-input"
                placeholder="e.g. Action Required"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={sending}
                maxLength={120}
              />
            </div>

            <div className="can-message-row">
              <label className="rec-label" htmlFor="can-message">Message</label>
              <textarea
                id="can-message"
                className="can-textarea"
                placeholder="Enter the notification message for the agency..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                rows={5}
                required
              />
            </div>

            {error && <div className="rec-error-banner"><p>{error}</p></div>}

            <div className="can-actions">
              <button type="submit" className="rec-oa-btn can-submit-btn" disabled={sending}>
                {sending ? <Spinner size="sm" color="white" /> : 'Send Notification'}
              </button>
            </div>

            <p className="can-sender-note">
              Sending as: <strong>{senderLabel}</strong>
              {auth.currentUser?.email ? ` (${auth.currentUser.email})` : ''}
            </p>
          </form>
        )}
      </div>

      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Notification Sent"
        variant="success"
        actions={
          <button type="button" className="modal-btn modal-btn-primary" onClick={() => setShowSuccess(false)}>
            OK
          </button>
        }
      >
        <p>
          Your notification was sent to <strong>{sentAgencyName}</strong>.
        </p>
        <p className="modal-subtext">The agency can view it from their notification bell.</p>
      </Modal>
    </main>
  );
}
