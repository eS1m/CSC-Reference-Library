import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uupload.css';
import uploadIcon from '../../assets/upload.svg';
import LockModal from '../../components/LockModal.jsx';
import Modal from '../../components/Modal';
import { auth } from '../../firebase/config';
import { serverTimestamp } from 'firebase/firestore';
import { createSubmission } from '../../firebase/collections/agencySubmissions';
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

  const fileInputRef = useRef(null);

  const { agencyName, hasSelfAssessment, hasActionPlan, loading } = useAgencyWorkflow();

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

    try {
      const response = await authFetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(errData || 'Upload to Drive failed.');
      }

      const driveData = await response.json();

      let submissionData = {
        userId: auth.currentUser.uid,
        agencyName: agencyName,
        fileName: formattedName,
        fileId: driveData.fileId,
        fileUrl: null,
        fileType: fileType,
        uploadedAt: serverTimestamp(),
        assessmentYear: new Date().getFullYear(),
      };

      /* Parse Excel only for Self-Assessment */
      if (isSelfAssessmentMode) {
        const parsedData = await parseAssessmentCells(file);
        if (parsedData.currentMaturityLevel || parsedData.targetMaturityLevel) {
          submissionData.parsedData = parsedData;
        }
      }

      await createSubmission(submissionData);

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
      }

      setFile(null);
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
    </main>
  );
}
