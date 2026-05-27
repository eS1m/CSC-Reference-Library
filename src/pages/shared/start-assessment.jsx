import React, { useState, useEffect, useMemo } from 'react';
import '../../css/shared/start-assessment.css';

import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { subscribeUsers } from '../../firebase/collections/users';
import { updateUser } from '../../firebase/collections/users';
import { createAssessmentHistory } from '../../firebase/collections/assessmentHistory';
import { lockEvidence } from '../../firebase/collections/evidenceUnlocks';
import { archiveRecommendationsByAgencyId } from '../../firebase/collections/recommendations';
import { createUserNotification } from '../../firebase/notifications';
import { authFetch } from '../../utils/apiClient';

import Modal from '../../components/Modal';
import Spinner from '../../components/Spinner';

const REVERT_WINDOW_SECONDS = 60;

export default function StartAssessment() {
  const [agencies, setAgencies] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [justStarted, setJustStarted] = useState(false);
  const [startedHistoryDocId, setStartedHistoryDocId] = useState(null);
  const [startedAgencyId, setStartedAgencyId] = useState(null);
  const [revertSecondsLeft, setRevertSecondsLeft] = useState(0);
  const [isReverting, setIsReverting] = useState(false);
  const [revertError, setRevertError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (users) => {
        const agencyUsers = users.filter((u) => u.role === 'u');
        setAgencies(agencyUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load agencies:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (revertSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setRevertSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [revertSecondsLeft]);

  const selectedAgency = useMemo(() => {
    return agencies.find((a) => a.id === selectedAgencyId) || null;
  }, [agencies, selectedAgencyId]);

  const simulationYear = import.meta.env.VITE_SIMULATION_YEAR;
  const currentCalendarYear = simulationYear ? simulationYear.trim() : new Date().getFullYear().toString();

  const newYear = useMemo(() => {
    if (!selectedAgency) return currentCalendarYear;
    const currentYear = selectedAgency.currentAssessmentYear;
    if (!currentYear) return currentCalendarYear;
    const next = (parseInt(currentYear, 10) + 1).toString();
    return next;
  }, [selectedAgency, currentCalendarYear]);

  const isAlreadyCurrentYear = selectedAgency?.currentAssessmentYear === currentCalendarYear;

  const handleStartClick = () => {
    if (!selectedAgencyId || isAlreadyCurrentYear) return;
    setShowConfirmModal(true);
    setRevertError('');
  };

  const handleConfirmStart = async () => {
    if (!selectedAgency) return;
    setIsStarting(true);
    setRevertError('');

    try {
      const agency = selectedAgency;
      const previousYear = agency.currentAssessmentYear || null;

      await updateUser(agency.id, {
        currentAssessmentYear: newYear,
        assessmentStartedAt: serverTimestamp(),
      });

      const historyRef = await createAssessmentHistory({
        agencyId: agency.id,
        year: newYear,
        previousYear,
        startedAt: serverTimestamp(),
        startedBy: auth.currentUser.uid,
      });

      await lockEvidence(agency.id, 'removed');
      await archiveRecommendationsByAgencyId(agency.id, previousYear);

      await createUserNotification(agency.id, {
        type: 'NEW_ASSESSMENT_STARTED',
        title: 'New Assessment Started',
        message: `A new assessment for ${newYear} has started. Please update your agency profile and employee data.`,
        agencyId: agency.id,
        agencyName: agency.agencyDetails?.agencyName || agency.email,
      });

      setJustStarted(true);
      setStartedHistoryDocId(historyRef.id);
      setStartedAgencyId(agency.id);
      setRevertSecondsLeft(REVERT_WINDOW_SECONDS);
      setShowConfirmModal(false);

      // Refresh agency list so the selected agency shows updated year
      setSelectedAgencyId('');
    } catch (err) {
      console.error('Start assessment error:', err);
      setRevertError('Failed to start assessment: ' + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleRevert = async () => {
    if (!startedAgencyId || !startedHistoryDocId) return;
    setIsReverting(true);
    setRevertError('');

    try {
      const res = await authFetch('/assessment/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId: startedAgencyId,
          historyDocId: startedHistoryDocId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Revert failed');
      }

      setJustStarted(false);
      setStartedHistoryDocId(null);
      setStartedAgencyId(null);
      setRevertSecondsLeft(0);
    } catch (err) {
      console.error('Revert error:', err);
      setRevertError(err.message);
    } finally {
      setIsReverting(false);
    }
  };

  if (loading) {
    return (
      <main className="start-assessment-main">
        <div className="loading-container">
          <Spinner size="lg" color="primary" />
          <p>Loading agencies...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="start-assessment-main">
      <div className="start-assessment-header">
        <h1>Start New Assessment</h1>
        <p>Select an agency to begin a new assessment year.</p>
      </div>

      <div className="start-assessment-card">
        <label htmlFor="agency-select" className="agency-select-label">
          Select Agency
        </label>
        <select
          id="agency-select"
          className="agency-select"
          value={selectedAgencyId}
          onChange={(e) => {
            setSelectedAgencyId(e.target.value);
            setRevertError('');
          }}
        >
          <option value="">-- Choose an agency --</option>
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.agencyDetails?.agencyName || agency.email}
            </option>
          ))}
        </select>

        {selectedAgency && (
          <div className="agency-info">
            <p>
              <strong>Email:</strong> {selectedAgency.email}
            </p>
            <p>
              <strong>Current Assessment Year:</strong>{' '}
              {selectedAgency.currentAssessmentYear || 'Not set'}
            </p>
            <p>
              <strong>New Assessment Year:</strong> {newYear}
            </p>
          </div>
        )}

        {isAlreadyCurrentYear && (
          <div className="year-warning">
            This agency is already on the current assessment year ({currentCalendarYear}).
          </div>
        )}

        <button
          className="start-btn"
          onClick={handleStartClick}
          disabled={!selectedAgencyId || isAlreadyCurrentYear || isStarting}
        >
          {isStarting ? (
            <Spinner size="sm" color="white" />
          ) : (
            'Start New Assessment'
          )}
        </button>

        {revertError && !justStarted && (
          <p className="error-text">{revertError}</p>
        )}
      </div>

      {justStarted && (
        <div className="revert-section">
          <div className="revert-header">
            <h3>Assessment Started Successfully</h3>
            <div className="revert-tooltip-wrapper">
              <span className="revert-tooltip-icon">?</span>
              <span className="revert-tooltip-text">
                If you made a mistake, you can revert this action for 60 seconds.
                {revertSecondsLeft > 0 && ` Time remaining: ${revertSecondsLeft}s`}
              </span>
            </div>
          </div>
          <button
            className="revert-btn"
            onClick={handleRevert}
            disabled={revertSecondsLeft === 0 || isReverting}
          >
            {isReverting ? (
              <Spinner size="sm" color="dark" />
            ) : revertSecondsLeft > 0 ? (
              `Revert (${revertSecondsLeft}s)`
            ) : (
              'Revert Expired'
            )}
          </button>
          {revertError && <p className="error-text">{revertError}</p>}
        </div>
      )}

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Start New Assessment"
        variant="warning"
        actions={
          <>
            <button
              className="modal-btn modal-btn-secondary"
              onClick={() => setShowConfirmModal(false)}
              disabled={isStarting}
            >
              Cancel
            </button>
            <button
              className="modal-btn modal-btn-danger"
              onClick={handleConfirmStart}
              disabled={isStarting}
            >
              {isStarting ? <Spinner size="xs" color="white" /> : 'Confirm'}
            </button>
          </>
        }
      >
        {selectedAgency && (
          <>
            <p>
              This will start a <strong>{newYear}</strong> assessment for{' '}
              <strong>{selectedAgency.agencyDetails?.agencyName || selectedAgency.email}</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              The agency must re-validate their profile and employee data. Existing
              files will be archived. Evidence Requirements and Field Office Monitoring
              selections will be reset.
            </p>
          </>
        )}
      </Modal>
    </main>
  );
}
