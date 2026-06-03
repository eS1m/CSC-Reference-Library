import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from '@e965/xlsx';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uupload.css';
import uploadIcon from '../../assets/upload.svg';
import LockModal from '../../components/LockModal.jsx';
import Modal from '../../components/Modal';
import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { createSubmission, updateSubmission } from '../../firebase/collections/agencySubmissions';
import { useAgencyWorkflow } from '../../hooks/useAgencyWorkflow';
import { logActivity } from '../../firebase/activityLog';
import { createAdminNotifications } from '../../firebase/notifications';
import Spinner from '../../components/Spinner';
import { authFetch } from '../../utils/apiClient';

export default function Uupload() {
  const nav = useNavigate();

  /* File Upload Functionality */
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  /* Drag State */
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  /* Inline Success Banner */
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  /* Gap Analysis State */
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showGapsModal, setShowGapsModal] = useState(false);
  const [showNoGapsModal, setShowNoGapsModal] = useState(false);
  const [gapData, setGapData] = useState(null);
  const [userTargetLevel, setUserTargetLevel] = useState('');
  const [pendingSubmissionId, setPendingSubmissionId] = useState(null);

  const fileInputRef = useRef(null);
  const parsedDataRef = useRef(null);

  const { agencyName, hasSelfAssessment, hasActionPlan, loading, currentAssessmentYear } = useAgencyWorkflow();

  const isSelfAssessmentMode = !hasSelfAssessment;

  /* ===== LOCKED STATE: Action Plan already submitted ===== */
  if (hasActionPlan) {
    return (
      <LockModal
        isOpen={true}
        onClose={() => nav('/dashboard-u')}
        customMessage={{
          title: 'Upload Locked',
          message: 'Your Action Plan has been successfully submitted.',
          subtext: 'Please wait for the CSC RO X for any updates.'
        }}
      />
    );
  }

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  /* Validate file extension against current mode */
  const isValidExtension = (selectedFile) => {
    if (!selectedFile) return false;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (isSelfAssessmentMode) {
      return ['xlsx', 'xls'].includes(ext);
    }
    return ['docx', 'doc', 'pdf'].includes(ext);
  };

  /* Validate filename pattern against current mode */
  const isValidName = (selectedFile) => {
    if (!selectedFile) return false;
    if (isSelfAssessmentMode) {
      return /Assessment|PRIME/i.test(selectedFile.name);
    }
    return /Action Plan|Assist/i.test(selectedFile.name);
  };

  /* Handle File Selection (shared by input and drop) */
  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!isValidExtension(selectedFile)) {
      const allowed = isSelfAssessmentMode ? '.xlsx, .xls' : '.docx, .doc, .pdf';
      const label = isSelfAssessmentMode ? 'Self-Assessments' : 'Action Plans';
      setUploadStatus(`Invalid file type. ${label} must be: ${allowed}`);
      setStatusType('error');
      return;
    }

    if (!isValidName(selectedFile)) {
      setPendingFile(selectedFile);
      setShowWarningModal(true);
      return;
    }

    setFile(selectedFile);
    setUploadStatus('');
  };

  /* File input change handler */
  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
    e.target.value = null;
  };

  /* Drag & Drop Handlers */
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

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  /* Parse H53 and Y53 from Excel for Action Plan pre-fill */
  const parseAssessmentCells = (fileBlob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets['Assessment Results'];
          if (!worksheet) {
            resolve({ currentMaturityLevel: null, targetMaturityLevel: null });
            return;
          }
          resolve({
            currentMaturityLevel: worksheet['H53']?.v != null ? String(worksheet['H53'].v) : null,
            targetMaturityLevel: worksheet['Y53']?.v != null ? String(worksheet['Y53'].v) : null
          });
        } catch {
          resolve({ currentMaturityLevel: null, targetMaturityLevel: null });
        }
      };
      reader.readAsArrayBuffer(fileBlob);
    });
  };

  /* Parse gap cells from RSP, L&D, PM, R&R sheets */
  const parseGapCells = (fileBlob, targetLevel) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const level = parseInt(targetLevel, 10);
          if (isNaN(level) || level < 1 || level > 4) {
            resolve(null);
            return;
          }
          const columnMap = {
            1: ['I'],
            2: ['I', 'P'],
            3: ['I', 'P', 'W'],
            4: ['I', 'P', 'W', 'AD']
          };
          const columns = columnMap[level];
          const rows = [7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
          const sheets = ['RSP', 'L&D', 'PM', 'R&R'];
          const gaps = {};
          let totalGaps = 0;
          sheets.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) return;
            const sheetGaps = [];
            rows.forEach(row => {
              columns.forEach(col => {
                const cell = worksheet[col + row];
                const value = cell?.v;
                if (value === 0 || value === 0.5) {
                  sheetGaps.push({ row, column: col, value });
                }
              });
            });
            if (sheetGaps.length > 0) {
              gaps[sheetName] = sheetGaps;
              totalGaps += sheetGaps.length;
            }
          });
          resolve({ gaps, totalGaps, hasGaps: totalGaps > 0 });
        } catch {
          resolve(null);
        }
      };
      reader.readAsArrayBuffer(fileBlob);
    });
  };

  /* Run gap analysis and show appropriate modal */
  const runGapAnalysis = async (fileBlob, targetLevel, submissionId, existingParsedData) => {
    const gapResult = await parseGapCells(fileBlob, targetLevel);
    if (!gapResult) return;
    setGapData(gapResult);
    const updatedParsedData = {
      ...(existingParsedData || {}),
      gaps: gapResult.gaps
    };
    await updateSubmission(submissionId, { parsedData: updatedParsedData });
    if (gapResult.hasGaps) {
      setShowGapsModal(true);
    } else {
      setShowNoGapsModal(true);
    }
  };

  /* Upload to Server */
  const handleUpload = async (e) => {
    if (e) e.stopPropagation();
    if (!file) return;
    if (!agencyName) {
      setUploadStatus('Agency Profile not found. Please complete your profile first.');
      setStatusType('error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');
    setStatusType('');

    const fileExtension = file.name.split('.').pop();
    const fileType = isSelfAssessmentMode ? 'Self-Assessment' : 'Action-Plan';
    const formattedName = isSelfAssessmentMode
      ? `PRIME-HRM Assessment-(${agencyName}).${fileExtension}`
      : `Action Plan-(${agencyName}).${fileExtension}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('agencyName', agencyName);
    formData.append('fileType', fileType);
    formData.append('assessmentYear', currentAssessmentYear || new Date().getFullYear().toString());

    try {
      const response = await authFetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Upload to Drive failed.');
      }

      const driveData = await response.json();

      let submissionData = {
        userId: auth.currentUser.uid,
        agencyName: agencyName,
        fileName: formattedName,
        fileId: driveData.fileId,
        fileUrl: driveData.fileId ? `https://drive.google.com/file/d/${driveData.fileId}/view` : driveData.webViewLink,
        fileType: fileType,
        uploadedAt: serverTimestamp(),
        assessmentYear: currentAssessmentYear || new Date().getFullYear().toString(),
      };

      /* Parse Excel only for Self-Assessment */
      let parsedData = null;
      if (isSelfAssessmentMode) {
        parsedData = await parseAssessmentCells(file);
        parsedDataRef.current = parsedData;
        if (parsedData.currentMaturityLevel || parsedData.targetMaturityLevel) {
          submissionData.parsedData = parsedData;
        }
      }

      const submissionRef = await createSubmission(submissionData);
      const submissionId = submissionRef.id;
      setPendingSubmissionId(submissionId);

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: 'u',
        action: 'UPLOAD_FILE',
        targetAgencyName: agencyName,
        details: { fileName: formattedName, fileType, fileId: driveData.fileId },
        message: `Agency ${agencyName} uploaded ${fileType}: ${formattedName}`
      });

      await createAdminNotifications({
        type: fileType === 'Self-Assessment' ? 'SELF_ASSESSMENT_UPLOAD' : 'ACTION_PLAN_UPLOAD',
        agencyId: auth.currentUser.uid,
        agencyName,
        fileName: formattedName
      });

      if (isSelfAssessmentMode) {
        setShowSuccessBanner(true);
        const targetLevel = parsedData?.targetMaturityLevel;
        const levelNum = parseInt(targetLevel, 10);
        if (!targetLevel || isNaN(levelNum) || levelNum < 1 || levelNum > 4) {
          setShowTargetModal(true);
        } else {
          await runGapAnalysis(file, targetLevel, submissionId, parsedData);
          setFile(null);
        }
      } else {
        setFile(null);
      }

      setUploadStatus('');
    } catch (err) {
      console.error(err);
      setUploadStatus('Error: ' + err.message);
      setStatusType('error');
    } finally {
      setIsUploading(false);
    }
  };

  /* Container Click */
  const handleContainerClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = isSelfAssessmentMode ? '.xlsx,.xls' : '.docx,.doc,.pdf';
      fileInputRef.current.click();
    }
  };

  /* Modal Actions */
  const confirmUploadAnyway = () => {
    if (pendingFile) {
      setFile(pendingFile);
      setUploadStatus('');
    }
    setShowWarningModal(false);
    setPendingFile(null);
  };

  const cancelWarning = () => {
    setPendingFile(null);
    setShowWarningModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const dismissSuccessBanner = () => {
    setShowSuccessBanner(false);
  };

  const confirmTargetLevel = async () => {
    const level = parseInt(userTargetLevel, 10);
    if (isNaN(level) || level < 1 || level > 4) return;
    setShowTargetModal(false);
    const existingParsedData = parsedDataRef.current || {};
    await runGapAnalysis(file, level, pendingSubmissionId, { ...existingParsedData, targetMaturityLevel: String(level) });
    setFile(null);
    setUserTargetLevel('');
  };

  const handleTargetModalCancel = () => {
    setShowTargetModal(false);
    setUserTargetLevel('');
    setFile(null);
  };

  const handleGapsModalConfirm = () => {
    setShowGapsModal(false);
    setGapData(null);
    setFile(null);
    nav('/action-plan-u');
  };

  const handleNoGapsModalConfirm = () => {
    setShowNoGapsModal(false);
    setGapData(null);
    setFile(null);
    nav('/action-plan-u');
  };

  return (
    <main className="main-content">
      <div className="upload-main-content-header">
        <h1 id="upload-main-content-title">Upload Documents</h1>
      </div>

      <div className="upload-container">
        {/* Inline Success Banner */}
        {showSuccessBanner && (
          <div className="upload-success-banner">
            <p>
              <strong>Self-Assessment uploaded successfully!</strong>{' '}
              You can now upload an Action Plan.
            </p>
            <button className="dismiss-btn" onClick={dismissSuccessBanner}>
              Okay
            </button>
          </div>
        )}      

        <div
          className={`upload-file-container ${isDragging ? 'dragging' : ''}`}
          onClick={handleContainerClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept={isSelfAssessmentMode ? '.xlsx,.xls' : '.docx,.doc,.pdf'}
            onChange={handleFileChange}
          />
          <img
            src={uploadIcon}
            alt="Upload File"
            className={`upload-icon ${isDragging ? '' : 'grey-filter'}`}
            width="120"
            height="120"
          />
          <p className="upload-prompt">
            {file
              ? `Selected: ${file.name}`
              : isDragging
                ? 'Drop your file here!'
                : 'Drag and drop your file here, or click to browse.'
            }
          </p>

          {uploadStatus && (
            <p className={`status-message ${statusType}`}>
              {uploadStatus}
            </p>
          )}

          <button
            className="upload-file-btn"
            disabled={!file || isUploading}
            onClick={(e) => handleUpload(e)}
          >
            {isUploading ? <Spinner size="md" color="white" /> : 'Upload File'}
          </button>
        </div>
        <div className="upload-mode-indicator">
          <span className="mode-label">
            {isSelfAssessmentMode ? 'Self-Assessment Upload' : 'Action Plan Upload'}
          </span>
          <span className="mode-hint">
            {isSelfAssessmentMode
              ? 'Excel files (.xlsx, .xls)'
              : 'Word or PDF files (.docx, .doc, .pdf)'}
          </span>
        </div>
      </div>

      <Modal
        isOpen={showWarningModal}
        onClose={cancelWarning}
        title="Warning"
        variant="warning"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={cancelWarning}>
              Cancel
            </button>
            <button className="modal-btn modal-btn-primary" onClick={confirmUploadAnyway}>
              Proceed Anyway
            </button>
          </>
        }
      >
        <p style={{ fontWeight: 600 }}>
          This file doesn&apos;t look like a {isSelfAssessmentMode ? 'Self-Assessment' : 'Action Plan'}.
        </p>
        <p className="modal-subtext">
          The official naming convention is{' '}
          <strong>
            &apos;{isSelfAssessmentMode ? 'PRIME-HRM Assessment' : 'Action Plan'}-(Agency Name)&apos;
          </strong>.
          Are you sure you want to proceed?
        </p>
      </Modal>

      {/* Target Maturity Level Input Modal */}
      <Modal
        isOpen={showTargetModal}
        onClose={handleTargetModalCancel}
        title="Target Maturity Level Required"
        variant="warning"
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={handleTargetModalCancel}>
              Cancel
            </button>
            <button className="modal-btn modal-btn-primary" onClick={confirmTargetLevel}>
              Confirm
            </button>
          </>
        }
      >
        <p style={{ fontWeight: 600, marginBottom: '12px' }}>
          We couldn&apos;t detect your Target Maturity Level from the uploaded file.
        </p>
        <p className="modal-subtext" style={{ marginBottom: '16px' }}>
          Please select your Target Maturity Level below to proceed with gap analysis.
        </p>
        <select
          style={{ width: '100%', padding: '10px 14px', fontSize: '1rem', borderRadius: '8px', border: '1px solid #ccc' }}
          value={userTargetLevel}
          onChange={(e) => setUserTargetLevel(e.target.value)}
        >
          <option value="">Select Target Maturity Level</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </Modal>

      {/* Gaps Found Modal */}
      <Modal
        isOpen={showGapsModal}
        onClose={handleGapsModalConfirm}
        title="Gaps Identified"
        variant="warning"
        actions={
          <button className="modal-btn modal-btn-primary" onClick={handleGapsModalConfirm}>
            Go to Action Plan
          </button>
        }
      >
        <p style={{ fontWeight: 600, marginBottom: '8px' }}>
          We found <strong>{gapData?.totalGaps || 0} gap(s)</strong> across your Self-Assessment.
        </p>
        <p className="modal-subtext">
          Gaps were identified in the following areas:
        </p>
        <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: '1.6' }}>
          {gapData && Object.keys(gapData.gaps).map(sheet => (
            <li key={sheet}>
              <strong>{sheet}</strong>: {gapData.gaps[sheet].length} gap(s)
            </li>
          ))}
        </ul>
        <p className="modal-subtext" style={{ marginTop: '12px' }}>
          You must generate an Action Plan to address these gaps.
        </p>
      </Modal>

      {/* No Gaps Modal */}
      <Modal
        isOpen={showNoGapsModal}
        onClose={handleNoGapsModalConfirm}
        title="No Gaps Found"
        variant="success"
        actions={
          <button className="modal-btn modal-btn-primary" onClick={handleNoGapsModalConfirm}>
            Go to Action Plan
          </button>
        }
      >
        <p style={{ fontWeight: 600, marginBottom: '8px' }}>
          No gaps identified within your target maturity level.
        </p>
        <p className="modal-subtext">
          You may still generate an Action Plan if desired.
        </p>
      </Modal>
    </main>
  );
}
