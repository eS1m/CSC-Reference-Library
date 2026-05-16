import React, { useState, useEffect } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import '../../css/lgu/action-plan-u.css';
import closeIcon from '../../assets/close.svg';

import { auth, db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../../firebase/activityLog';
import { useAgencyData } from '../../hooks/useAgencyData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* Template file URL — resolved relative to this module */
const templateUrl = new URL('../../excel_test_data/Action Plan Template - Agency Guide (Assist Form No. 2).docx', import.meta.url).href;

export default function ActionPlanU() {
  const { agencyName, submissions } = useAgencyData();

  /* Only two inputs for now */
  const [inputs, setInputs] = useState({
    currentMaturityLevel: '',
    targetMaturityLevel: ''
  });

  /* Preview modal states */
  const [showModal, setShowModal] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [generatedDocx, setGeneratedDocx] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadStatusType, setUploadStatusType] = useState('');

  /* Pre-fill inputs from the latest Self-Assessment parsed data */
  useEffect(() => {
    const selfAssessment = submissions.find(s => s.fileType === 'Self-Assessment');
    if (selfAssessment?.parsedData) {
      setInputs(prev => ({
        ...prev,
        currentMaturityLevel: selfAssessment.parsedData.currentMaturityLevel || prev.currentMaturityLevel,
        targetMaturityLevel: selfAssessment.parsedData.targetMaturityLevel || prev.targetMaturityLevel
      }));
    }
  }, [submissions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  /* Generate docx from template + preview */
  const handleGeneratePreview = async () => {
    if (!agencyName) {
      setUploadStatus('Agency profile not found. Please complete your profile first.');
      setUploadStatusType('error');
      return;
    }

    setIsGenerating(true);
    setUploadStatus('');
    setUploadStatusType('');

    try {
      const templateRes = await fetch(templateUrl);
      if (!templateRes.ok) throw new Error('Failed to load Word template.');
      const templateBuffer = await templateRes.arrayBuffer();

      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData({
        currentMaturityLevel: inputs.currentMaturityLevel || 'N/A',
        targetMaturityLevel: inputs.targetMaturityLevel || 'N/A',
        agencyName: agencyName,
        currentYear: new Date().getFullYear().toString(),
      });

      doc.render();
      const generatedBuffer = doc.getZip().generate({ type: 'arraybuffer' });
      setGeneratedDocx(generatedBuffer);

      const mammothResult = await mammoth.convertToHtml({ arrayBuffer: generatedBuffer });
      const rawHtml = mammothResult.value;

      const styledPreview = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              line-height: 1.6;
              max-width: 210mm;
              margin: 0 auto;
              padding: 20mm;
              background: #fff;
              color: #333;
              font-size: 11pt;
            }
            table { border-collapse: collapse; width: 100%; margin: 12px 0; }
            td, th { border: 1px solid #bbb; padding: 6px 8px; text-align: left; }
            p { margin: 8px 0; }
            h1, h2, h3 { margin: 16px 0 8px; color: #1a365d; }
            ul, ol { margin: 8px 0; padding-left: 24px; }
          </style>
        </head>
        <body>${rawHtml}</body>
        </html>
      `;

      const blob = new Blob([styledPreview], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
      setShowModal(true);
    } catch (err) {
      console.error('Generation error:', err);
      setUploadStatus('Failed to generate preview: ' + err.message);
      setUploadStatusType('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDocx) return;
    const blob = new Blob([generatedDocx], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const year = new Date().getFullYear();
    saveAs(blob, `Action Plan - ${agencyName} - ${year}.docx`);
  };

  const handleUploadToDrive = async () => {
    if (!generatedDocx || !agencyName) return;

    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');
    setUploadStatusType('');

    try {
      const blob = new Blob([generatedDocx], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const formData = new FormData();
      formData.append('file', blob, `Action Plan-${agencyName}.docx`);
      formData.append('agencyName', agencyName);

      const res = await fetch(`${API_URL}/upload-action-plan`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload to Drive failed.');
      }

      const driveData = await res.json();
      const year = new Date().getFullYear();
      const fileName = `Action Plan - ${agencyName} - ${year}.docx`;

      await addDoc(collection(db, 'agencySubmissions'), {
        userId: auth.currentUser.uid,
        agencyName: agencyName,
        fileName: fileName,
        fileId: driveData.fileId,
        fileUrl: driveData.webViewLink,
        fileType: 'Action-Plan',
        uploadedAt: serverTimestamp(),
        assessmentYear: year,
        status: 'Pending'
      });

      await logActivity({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userRole: 'u',
        action: 'UPLOAD_FILE',
        targetAgencyName: agencyName,
        details: { fileName, fileType: 'Action-Plan', fileId: driveData.fileId },
        message: `Agency ${agencyName} uploaded Action Plan: ${fileName}`
      });

      setUploadStatus('Action Plan uploaded successfully!');
      setUploadStatusType('success');

      setTimeout(() => {
        setShowModal(false);
        setPreviewBlobUrl('');
        setGeneratedDocx(null);
        setUploadStatus('');
      }, 1500);

    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('Error: ' + err.message);
      setUploadStatusType('error');
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl('');
    }
    setGeneratedDocx(null);
    setUploadStatus('');
    setUploadStatusType('');
  };

  return (
    <main className="main-content">
      <div className="action-plan-main-content-header">
        <h1 id="action-plan-main-content-title">Action Plan</h1>
      </div>

      <div className="action-plan-container">
        <div className="action-plan-intro">
          <p>Generate your agency's Action Plan based on the Self-Assessment data. Edit the fields below if needed, then preview and upload.</p>
        </div>

        <div className="action-plan-inputs-section">
          <h2>Assessment Data</h2>
          <div className="action-plan-inputs-grid">
            <div className="test-input-wrapper">
              <label htmlFor="currentMaturityLevel" className="test-input-label">Current Maturity Level</label>
              <input
                id="currentMaturityLevel"
                name="currentMaturityLevel"
                type="text"
                className="test-input-field"
                value={inputs.currentMaturityLevel}
                onChange={handleInputChange}
                placeholder="Enter current maturity level..."
              />
            </div>
            <div className="test-input-wrapper">
              <label htmlFor="targetMaturityLevel" className="test-input-label">Target Maturity Level</label>
              <input
                id="targetMaturityLevel"
                name="targetMaturityLevel"
                type="text"
                className="test-input-field"
                value={inputs.targetMaturityLevel}
                onChange={handleInputChange}
                placeholder="Enter target maturity level..."
              />
            </div>
          </div>

          <div className="test-actions-row">
            <button
              className="generate-preview-btn"
              onClick={handleGeneratePreview}
              disabled={isGenerating || isUploading}
            >
              {isGenerating ? <div className="spinner-small"></div> : 'Generate Preview'}
            </button>
            {uploadStatus && !showModal && (
              <span className={`inline-status ${uploadStatusType}`}>{uploadStatus}</span>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h2>Document Preview</h2>
              <button className="modal-close" onClick={closeModal}>
                <img src={closeIcon} alt="Close" width="20" height="20" />
              </button>
            </div>

            <div className="preview-modal-body">
              <iframe
                src={previewBlobUrl}
                title="Document Preview"
                className="preview-iframe"
              />
            </div>

            <div className="preview-modal-footer">
              {uploadStatus && (
                <span className={`footer-status ${uploadStatusType}`}>{uploadStatus}</span>
              )}
              <div className="preview-modal-actions">
                <button className="cancel-btn" onClick={closeModal}>
                  Close
                </button>
                <button className="download-btn" onClick={handleDownload} disabled={!generatedDocx}>
                  Download as Word
                </button>
                <button
                  className="upload-confirm-btn"
                  onClick={handleUploadToDrive}
                  disabled={isUploading || !generatedDocx}
                >
                  {isUploading ? <div className="spinner-small white"></div> : 'Upload to Google Drive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
