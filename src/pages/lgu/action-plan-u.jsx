import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from '@slosarek/docxtemplater-image-module-free';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import '../../css/lgu/action-plan-u.css';
import closeIcon from '../../assets/close.svg';
import tooltipIcon from '../../assets/tooltip.svg';
import LockModal from '../../components/LockModal.jsx';

import { auth, db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../../firebase/activityLog';
import { createAdminNotifications } from '../../firebase/notifications';
import { useAgencyData } from '../../hooks/useAgencyData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const templateUrl = new URL('../../assets/templates/Action Plan Template - Agency Guide (Assist Form No. 2).docx', import.meta.url).href;

const TOOLTIP_TEXT = {
  strengthsAndOpportunities: 'Identify your strengths and opportunities for improvement. ',
  hrSystemToPrioritize: 'For HR systems we need to improve on, which one/s do you now want to prioritize taking into consideration your Agency Mandate? Why?',
  targetSystemAreaFocus: 'Of the target HR system, which areas (systems, practices and/ or competencies) do you want to focus on? Why?',
  actionStep: 'Recommended Action Steps based on Assessment Tool Results & Report & as determined by Agency Stakeholders ',
  timeline: '(Day/Month)',
  successIndicators: 'How will you know that you are making progress? What are your benchmarks? How will you determine that your goal has been reached? What are your measures?'
};

export default function ActionPlanU() {
  const navigate = useNavigate();
  const { agencyName, submissions, hasActionPlan } = useAgencyData();

  const [inputs, setInputs] = useState({
    currentMaturityLevel: '',
    targetMaturityLevel: '',
    strengthsAndOpportunities: '',
    hrSystemToPrioritize: '',
    targetSystemAreaFocus: ''
  });

  /* Preview modal states */
  const [showModal, setShowModal] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [generatedDocx, setGeneratedDocx] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadStatusType, setUploadStatusType] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  /* Validation Error Modal */
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  /* Step navigation */
  const [currentStep, setCurrentStep] = useState(2);

  /* ========== STEP 4: Next Process Consulting Session ========== */
  const [nextConsultingDate, setNextConsultingDate] = useState('');
  const [agendaConsulting, setAgendaConsulting] = useState('');
  const [tasksPriorConsulting, setTasksPriorConsulting] = useState(['']);

  /* ========== STEP 4: Signatories ========== */
  const [preparedName, setPreparedName] = useState('');
  const [preparedDate, setPreparedDate] = useState('');
  const [preparedSignaturePreview, setPreparedSignaturePreview] = useState('');
  const [preparedSignatureDims, setPreparedSignatureDims] = useState(null);

  const [assistedName, setAssistedName] = useState('');
  const [assistedDate, setAssistedDate] = useState('');
  const [assistedSignaturePreview, setAssistedSignaturePreview] = useState('');
  const [assistedSignatureDims, setAssistedSignatureDims] = useState(null);

  const [approvedName, setApprovedName] = useState('');
  const [approvedDate, setApprovedDate] = useState('');
  const [approvedSignaturePreview, setApprovedSignaturePreview] = useState('');
  const [approvedSignatureDims, setApprovedSignatureDims] = useState(null);

  const handleSignatureDrop = (e, setPreview, setDims) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target.result);
        const img = new Image();
        img.onload = () => setDims([img.width, img.height]);
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureSelect = (e, setPreview, setDims) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target.result);
        const img = new Image();
        img.onload = () => setDims([img.width, img.height]);
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = (setPreview, setDims) => {
    setPreview('');
    setDims(null);
  };

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

  /* ========== STEP 3: Action Steps State ========== */
  const [actionSteps, setActionSteps] = useState([
    {
      actionStep: '',
      activities: [
        { activity: '', responsibilities: '', timeline: '', indicators: '' }
      ]
    }
  ]);

  const addActionStep = () => {
    setActionSteps(prev => [
      ...prev,
      {
        actionStep: '',
        activities: [
          { activity: '', responsibilities: '', timeline: '', indicators: '' }
        ]
      }
    ]);
  };

  const removeActionStep = (stepIndex) => {
    setActionSteps(prev => prev.filter((_, i) => i !== stepIndex));
  };

  const updateActionStep = (stepIndex, value) => {
    setActionSteps(prev =>
      prev.map((step, i) => (i === stepIndex ? { ...step, actionStep: value } : step))
    );
  };

  const addActivity = (stepIndex) => {
    setActionSteps(prev =>
      prev.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              activities: [
                ...step.activities,
                { activity: '', responsibilities: '', timeline: '', indicators: '' }
              ]
            }
          : step
      )
    );
  };

  const removeActivity = (stepIndex, activityIndex) => {
    setActionSteps(prev =>
      prev.map((step, i) =>
        i === stepIndex
          ? { ...step, activities: step.activities.filter((_, j) => j !== activityIndex) }
          : step
      )
    );
  };

  const updateActivity = (stepIndex, activityIndex, field, value) => {
    setActionSteps(prev =>
      prev.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              activities: step.activities.map((act, j) =>
                j === activityIndex ? { ...act, [field]: value } : act
              )
            }
          : step
      )
    );
  };

  /* ========== STEP 3: Resources / Barriers / Communications ========== */
  const [step3Extras, setStep3Extras] = useState({
    resourcesAvailable: [''],
    resourcesNeeded: [''],
    individualOrganizationsAgainst: [''],
    iOAHow: [''],
    communicationsInvolved: [''],
    communicationsMethods: [''],
    communicationsOften: ['']
  });

  const addBullet = (category) => {
    setStep3Extras(prev => ({ ...prev, [category]: [...prev[category], ''] }));
  };

  const removeBullet = (category, index) => {
    setStep3Extras(prev => ({ ...prev, [category]: prev[category].filter((_, i) => i !== index) }));
  };

  const updateBullet = (category, index, value) => {
    setStep3Extras(prev => ({
      ...prev,
      [category]: prev[category].map((item, i) => (i === index ? value : item))
    }));
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

      const scaleDims = (dims, maxW = 150) => {
        if (!dims) return [1, 1];
        const [w, h] = dims;
        if (w <= maxW) return [w, h];
        return [maxW, Math.round(h * (maxW / w))];
      };

      const signatureDimsMap = {
        preparedSignature: preparedSignatureDims,
        assistedSignature: assistedSignatureDims,
        approvedSignature: approvedSignatureDims
      };

      const base64ToUint8Array = (dataUrl) => {
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      };

      /* Monkey-patch missing EMU converter for docxtemplater 3.x compatibility */
      const DocUtils = Docxtemplater.DocUtils;
      if (!DocUtils.convertPixelsToEmus) {
        DocUtils.convertPixelsToEmus = (pixel) => Math.round(pixel * 9525);
      }

      const imageModule = new ImageModule({
        centered: false,
        getImage: (tagValue) => {
          if (!tagValue || !tagValue.startsWith('data:')) return new Uint8Array(0);
          return base64ToUint8Array(tagValue);
        },
        getSize: (imgBuffer, tagValue, tagName) => {
          const dims = signatureDimsMap[tagName];
          return dims ? scaleDims(dims) : [1, 1];
        }
      });

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [imageModule]
      });

      const actionPlanTable = actionSteps.flatMap(step =>
        step.activities.map(act => ({
          actionStep: step.actionStep || 'N/A',
          activity: act.activity || 'N/A',
          responsibilities: act.responsibilities || 'N/A',
          timeline: act.timeline || 'N/A',
          indicators: act.indicators || 'N/A'
        }))
      );

      const cleanExtras = (arr) => arr.filter(item => item.trim() !== '');

      doc.setData({
        currentMaturityLevel: inputs.currentMaturityLevel || 'N/A',
        targetMaturityLevel: inputs.targetMaturityLevel || 'N/A',
        strengthsAndOpportunities: inputs.strengthsAndOpportunities || 'N/A',
        hrSystemToPrioritize: inputs.hrSystemToPrioritize || 'N/A',
        targetSystemAreaFocus: inputs.targetSystemAreaFocus || 'N/A',
        actionPlanTable: actionPlanTable.length > 0 ? actionPlanTable : [
          { actionStep: 'N/A', activity: 'N/A', responsibilities: 'N/A', timeline: 'N/A', indicators: 'N/A' }
        ],
        resourcesAvailable: cleanExtras(step3Extras.resourcesAvailable),
        resourcesNeeded: cleanExtras(step3Extras.resourcesNeeded),
        individualOrganizationsAgainst: cleanExtras(step3Extras.individualOrganizationsAgainst),
        iOAHow: cleanExtras(step3Extras.iOAHow),
        communicationsInvolved: cleanExtras(step3Extras.communicationsInvolved),
        communicationsMethods: cleanExtras(step3Extras.communicationsMethods),
        communicationsOften: cleanExtras(step3Extras.communicationsOften),
        nextConsulting: nextConsultingDate || 'N/A',
        agendaConsulting: agendaConsulting || 'N/A',
        tasksPriorConsulting: cleanExtras(tasksPriorConsulting),
        preparedName: preparedName || 'N/A',
        preparedDate: preparedDate || 'N/A',
        preparedSignature: preparedSignaturePreview || null,
        assistedName: assistedName || 'N/A',
        assistedDate: assistedDate || 'N/A',
        assistedSignature: assistedSignaturePreview || null,
        approvedName: approvedName || 'N/A',
        approvedDate: approvedDate || 'N/A',
        approvedSignature: approvedSignaturePreview || null,
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
            img { max-width: 100%; height: auto; display: block; }
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

  const validateAllFields = () => {
    const missing = [];

    /* Step 2: Assessment Inputs */
    if (!inputs.currentMaturityLevel.trim()) missing.push('Current Maturity Level');
    if (!inputs.targetMaturityLevel.trim()) missing.push('Target Maturity Level');
    if (!inputs.strengthsAndOpportunities.trim()) missing.push('Strengths and Opportunities');
    if (!inputs.hrSystemToPrioritize.trim()) missing.push('HR System to Prioritize');
    if (!inputs.targetSystemAreaFocus.trim()) missing.push('Target System Area Focus');

    /* Step 3: Action Steps */
    actionSteps.forEach((step, si) => {
      if (!step.actionStep.trim()) missing.push(`Action Step ${si + 1}: Description`);
      step.activities.forEach((act, ai) => {
        if (!act.activity.trim()) missing.push(`Action Step ${si + 1}, Activity ${ai + 1}: Activity`);
        if (!act.responsibilities.trim()) missing.push(`Action Step ${si + 1}, Activity ${ai + 1}: Responsibilities`);
        if (!act.timeline.trim()) missing.push(`Action Step ${si + 1}, Activity ${ai + 1}: Timeline`);
        if (!act.indicators.trim()) missing.push(`Action Step ${si + 1}, Activity ${ai + 1}: Success Indicators`);
      });
    });

    /* Step 4: Next Consulting Session */
    if (!nextConsultingDate) missing.push('Next Consulting Date');
    if (!agendaConsulting.trim()) missing.push('Agenda for Next Consulting');
    const hasTasks = tasksPriorConsulting.some(t => t.trim());
    if (!hasTasks) missing.push('Tasks Prior to Next Consulting');

    /* Step 4: Signatories */
    if (!preparedName.trim()) missing.push('Prepared By: Name');
    if (!preparedDate) missing.push('Prepared By: Date');
    if (!preparedSignaturePreview) missing.push('Prepared By: Signature Image');
    if (!assistedName.trim()) missing.push('Assisted By: Name');
    if (!assistedDate) missing.push('Assisted By: Date');
    if (!assistedSignaturePreview) missing.push('Assisted By: Signature Image');
    if (!approvedName.trim()) missing.push('Approved By: Name');
    if (!approvedDate) missing.push('Approved By: Date');
    if (!approvedSignaturePreview) missing.push('Approved By: Signature Image');

    return missing;
  };

  const handleUploadToDrive = async () => {
    if (!generatedDocx || !agencyName) return;

    const missing = validateAllFields();
    if (missing.length > 0) {
      setValidationErrors(missing);
      setShowValidationModal(true);
      return;
    }

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
        fileUrl: driveData.fileId ? `https://drive.google.com/file/d/${driveData.fileId}/view` : driveData.webViewLink,
        fileType: 'Action-Plan',
        uploadedAt: serverTimestamp(),
        assessmentYear: year
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

      await createAdminNotifications({
        type: 'ACTION_PLAN_UPLOAD',
        agencyId: auth.currentUser.uid,
        agencyName,
        fileName
      });

      setUploadStatus('');
      setShowModal(false);
      setPreviewBlobUrl('');
      setGeneratedDocx(null);
      setShowSuccessModal(true);

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

  const [showLockModal, setShowLockModal] = useState(false);

  useEffect(() => {
    if (hasActionPlan) {
      setShowLockModal(true);
    }
  }, [hasActionPlan]);

  return (
    <main className="main-content">
      <div className="action-plan-main-content-header">
        <h1 id="action-plan-main-content-title">Action Plan</h1>
        <div className="step-nav">
          {[2, 3, 4].map(step => (
            <button
              key={step}
              className={`step-btn ${currentStep === step ? 'active' : ''}`}
              onClick={() => setCurrentStep(step)}
            >
              Step {step}
            </button>
          ))}
        </div>
      </div>

      <div className="action-plan-container">
        {currentStep === 2 && (
          <>
            <div className="action-plan-inputs-section">
              <h2>Determining the Current State</h2>
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

              <div className="action-plan-textareas">
                <div className="test-input-wrapper textarea-wrapper">
                  <label htmlFor="strengthsAndOpportunities" className="test-input-label">
                    Strengths and Opportunities
                    <span className="tooltip-trigger">
                      <span className="tooltip-trigger-icon">
                        <img src={tooltipIcon} alt="Tooltip" className="tooltip grey-filter" />
                      </span>
                      <span className="tooltip-text">{TOOLTIP_TEXT.strengthsAndOpportunities}</span>
                    </span>
                  </label>
                  <textarea
                    id="strengthsAndOpportunities"
                    name="strengthsAndOpportunities"
                    className="test-textarea-field"
                    value={inputs.strengthsAndOpportunities}
                    onChange={handleInputChange}
                    placeholder="Enter strengths and opportunities..."
                    rows={4}
                  />
                </div>

                <div className="test-input-wrapper textarea-wrapper">
                  <label htmlFor="hrSystemToPrioritize" className="test-input-label">
                    HR System to Prioritize
                    <span className="tooltip-trigger">
                      <span className="tooltip-trigger-icon">
                        <img src={tooltipIcon} alt="Tooltip" className="tooltip grey-filter" />
                      </span>
                      <span className="tooltip-text">{TOOLTIP_TEXT.hrSystemToPrioritize}</span>
                    </span>
                  </label>
                  <textarea
                    id="hrSystemToPrioritize"
                    name="hrSystemToPrioritize"
                    className="test-textarea-field"
                    value={inputs.hrSystemToPrioritize}
                    onChange={handleInputChange}
                    placeholder="Enter HR system to prioritize..."
                    rows={4}
                  />
                </div>

                <div className="test-input-wrapper textarea-wrapper">
                  <label htmlFor="targetSystemAreaFocus" className="test-input-label">
                    Target System Area Focus
                    <span className="tooltip-trigger">
                      <span className="tooltip-trigger-icon">
                        <img src={tooltipIcon} alt="Tooltip" className="tooltip grey-filter" />
                      </span>
                      <span className="tooltip-text">{TOOLTIP_TEXT.targetSystemAreaFocus}</span>
                    </span>
                  </label>
                  <textarea
                    id="targetSystemAreaFocus"
                    name="targetSystemAreaFocus"
                    className="test-textarea-field"
                    value={inputs.targetSystemAreaFocus}
                    onChange={handleInputChange}
                    placeholder="Enter target system area focus..."
                    rows={4}
                  />
                </div>
              </div>
            </div>
            <div className="upload-action-plan-note">
              <p>
                Already have an Action Plan document prepared?{' '}
                <span className="upload-link" onClick={() => navigate('/upload-u')}>
                  Upload it directly
                </span>{' '}
                instead of generating one here.
              </p>
            </div>
          </>
        )}

        {currentStep === 3 && (
          <div className="step3-container">
            <h2>Mapping Out the Action Steps</h2>
            {actionSteps.map((step, stepIndex) => (
              <div className="action-step-card" key={stepIndex}>
                <div className="action-step-header">
                  <label htmlFor={`action-step-${stepIndex}`}>
                    Action Step {stepIndex + 1}
                    <span className="tooltip-trigger">
                      <span className="tooltip-trigger-icon">
                        <img src={tooltipIcon} alt="Tooltip" className="tooltip grey-filter" />
                      </span>
                      <span className="tooltip-text">{TOOLTIP_TEXT.actionStep}</span>
                    </span>
                  </label>
                  <input
                    id={`action-step-${stepIndex}`}
                    type="text"
                    className="action-step-input"
                    value={step.actionStep}
                    onChange={(e) => updateActionStep(stepIndex, e.target.value)}
                    placeholder="Enter recommended action step..."
                  />
                  {actionSteps.length > 1 && (
                    <button
                      className="remove-card-btn"
                      onClick={() => removeActionStep(stepIndex)}
                      title="Remove Action Step"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Detailed Activities</th>
                      <th>Responsibilities</th>
                      <th>
                        Timeline
                        <span className="tooltip-trigger">
                          <span className="tooltip-trigger-icon">
                            <img src={tooltipIcon} alt="Tooltip" className="tooltip white-filter" />
                          </span>
                          <span className="tooltip-text">{TOOLTIP_TEXT.timeline}</span>
                        </span>
                      </th>
                      <th>
                        Success Indicators
                        <span className="tooltip-trigger">
                          <span className="tooltip-trigger-icon">
                            <img src={tooltipIcon} alt="Tooltip" className="tooltip white-filter" />
                          </span>
                          <span className="tooltip-text">{TOOLTIP_TEXT.successIndicators}</span>
                        </span>
                      </th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.activities.map((act, actIndex) => (
                      <tr key={actIndex}>
                        <td>
                          <input
                            className="table-input-field"
                            value={act.activity}
                            onChange={(e) => updateActivity(stepIndex, actIndex, 'activity', e.target.value)}
                            placeholder="What will be done?"
                          />
                        </td>
                        <td>
                          <input
                            className="table-input-field"
                            value={act.responsibilities}
                            onChange={(e) => updateActivity(stepIndex, actIndex, 'responsibilities', e.target.value)}
                            placeholder="Who will do it?"
                          />
                        </td>
                        <td>
                          <input
                            className="table-input-field"
                            value={act.timeline}
                            onChange={(e) => updateActivity(stepIndex, actIndex, 'timeline', e.target.value)}
                            placeholder="By when?"
                          />
                        </td>
                        <td>
                          <input
                            className="table-input-field"
                            value={act.indicators}
                            onChange={(e) => updateActivity(stepIndex, actIndex, 'indicators', e.target.value)}
                            placeholder="How will you measure progress?"
                          />
                        </td>
                        <td>
                          {step.activities.length > 1 && (
                            <button
                              className="remove-row-btn"
                              onClick={() => removeActivity(stepIndex, actIndex)}
                              title="Remove Activity"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button className="add-row-btn" onClick={() => addActivity(stepIndex)}>
                  + Add Activity
                </button>
              </div>
            ))}

            <button className="add-card-btn" onClick={addActionStep}>
              + Add Action Step
            </button>

            {/* Resources */}
            <div className="extras-card">
              <h3 className="extras-card-title">Resources: Identify the following:</h3>
              <div className="extras-category">
                <p className="extras-category-label">Available:</p>
                {step3Extras.resourcesAvailable.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('resourcesAvailable', i, e.target.value)}
                      placeholder="Enter resource..."
                    />
                    {step3Extras.resourcesAvailable.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('resourcesAvailable', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('resourcesAvailable')}>+ Add</button>
              </div>
              <div className="extras-category">
                <p className="extras-category-label">Needed:</p>
                {step3Extras.resourcesNeeded.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('resourcesNeeded', i, e.target.value)}
                      placeholder="Enter resource..."
                    />
                    {step3Extras.resourcesNeeded.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('resourcesNeeded', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('resourcesNeeded')}>+ Add</button>
              </div>
            </div>

            {/* Potential Barriers */}
            <div className="extras-card">
              <h3 className="extras-card-title">Potential Barriers</h3>
              <div className="extras-category">
                <p className="extras-category-label">Individual / Organizations Against:</p>
                {step3Extras.individualOrganizationsAgainst.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('individualOrganizationsAgainst', i, e.target.value)}
                      placeholder="Enter barrier..."
                    />
                    {step3Extras.individualOrganizationsAgainst.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('individualOrganizationsAgainst', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('individualOrganizationsAgainst')}>+ Add</button>
              </div>
              <div className="extras-category">
                <p className="extras-category-label">How:</p>
                {step3Extras.iOAHow.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('iOAHow', i, e.target.value)}
                      placeholder="Enter how to address..."
                    />
                    {step3Extras.iOAHow.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('iOAHow', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('iOAHow')}>+ Add</button>
              </div>
            </div>

            {/* Communications Plan */}
            <div className="extras-card">
              <h3 className="extras-card-title">Communications Plan</h3>
              <div className="extras-category">
                <p className="extras-category-label">Involved:</p>
                {step3Extras.communicationsInvolved.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('communicationsInvolved', i, e.target.value)}
                      placeholder="Enter stakeholder..."
                    />
                    {step3Extras.communicationsInvolved.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('communicationsInvolved', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('communicationsInvolved')}>+ Add</button>
              </div>
              <div className="extras-category">
                <p className="extras-category-label">Methods:</p>
                {step3Extras.communicationsMethods.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('communicationsMethods', i, e.target.value)}
                      placeholder="Enter method..."
                    />
                    {step3Extras.communicationsMethods.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('communicationsMethods', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('communicationsMethods')}>+ Add</button>
              </div>
              <div className="extras-category">
                <p className="extras-category-label">Often:</p>
                {step3Extras.communicationsOften.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => updateBullet('communicationsOften', i, e.target.value)}
                      placeholder="Enter frequency..."
                    />
                    {step3Extras.communicationsOften.length > 1 && (
                      <button className="remove-bullet-btn" onClick={() => removeBullet('communicationsOften', i)} title="Remove">×</button>
                    )}
                  </div>
                ))}
                <button className="add-bullet-btn" onClick={() => addBullet('communicationsOften')}>+ Add</button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="step4-container">
            <h2>Next Process Consulting Session</h2>

            <div className="step4-card">
              <div className="step4-field-row">
                <label htmlFor="nextConsultingDate" className="step4-field-label">
                  Date of Next Process Consulting Session:
                </label>
                <input
                  id="nextConsultingDate"
                  type="date"
                  className="step4-date-input"
                  value={nextConsultingDate}
                  onChange={(e) => setNextConsultingDate(e.target.value)}
                />
              </div>

              <div className="step4-field-row">
                <label htmlFor="agendaConsulting" className="step4-field-label">
                  Agenda for Next Process Consulting Session:
                </label>
                <textarea
                  id="agendaConsulting"
                  className="step4-textarea"
                  value={agendaConsulting}
                  onChange={(e) => setAgendaConsulting(e.target.value)}
                  placeholder="Enter agenda items..."
                  rows={4}
                />
              </div>

              <div className="step4-field-row">
                <p className="step4-field-label">
                  Tasks to be achieved prior to next Process Consulting Session &amp; Person/s Responsible:
                </p>
                {tasksPriorConsulting.map((item, i) => (
                  <div className="bullet-input-row" key={i}>
                    <input
                      className="bullet-input-field"
                      value={item}
                      onChange={(e) => {
                        const updated = [...tasksPriorConsulting];
                        updated[i] = e.target.value;
                        setTasksPriorConsulting(updated);
                      }}
                      placeholder="Enter task and responsible person..."
                    />
                    {tasksPriorConsulting.length > 1 && (
                      <button
                        className="remove-bullet-btn"
                        onClick={() => setTasksPriorConsulting(prev => prev.filter((_, idx) => idx !== i))}
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="add-bullet-btn"
                  onClick={() => setTasksPriorConsulting(prev => [...prev, ''])}
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Signatories Table */}
            <div className="signatories-section">
              <h3 className="signatories-title">Signatories</h3>
              <table className="signatories-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Name</th>
                    <th style={{ width: '40%' }}>Signature</th>
                    <th style={{ width: '25%' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span className="signatory-label">Prepared By:</span>
                      <input
                        type="text"
                        className="signatory-name-input"
                        value={preparedName}
                        onChange={(e) => setPreparedName(e.target.value)}
                        placeholder="Enter name..."
                      />
                    </td>
                    <td>
                      {preparedSignaturePreview ? (
                        <div className="signature-preview-wrap">
                          <img src={preparedSignaturePreview} alt="Prepared signature" className="signature-preview-img" />
                          <button
                            className="signature-remove-btn"
                            onClick={() => clearSignature(setPreparedSignaturePreview, setPreparedSignatureDims)}
                            title="Remove signature"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div
                          className="signature-dropzone"
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={(e) => e.currentTarget.classList.add('drag-over')}
                          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                          onDrop={(e) => {
                            e.currentTarget.classList.remove('drag-over');
                            handleSignatureDrop(e, setPreparedSignaturePreview, setPreparedSignatureDims);
                          }}
                          onClick={() => document.getElementById('prepared-sig-input').click()}
                        >
                          <span className="signature-dropzone-text">Click or drag image here</span>
                          <input
                            id="prepared-sig-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleSignatureSelect(e, setPreparedSignaturePreview, setPreparedSignatureDims)}
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="signatory-date-input"
                        value={preparedDate}
                        onChange={(e) => setPreparedDate(e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="signatory-label">Assisted By:</span>
                      <input
                        type="text"
                        className="signatory-name-input"
                        value={assistedName}
                        onChange={(e) => setAssistedName(e.target.value)}
                        placeholder="Enter name..."
                      />
                    </td>
                    <td>
                      {assistedSignaturePreview ? (
                        <div className="signature-preview-wrap">
                          <img src={assistedSignaturePreview} alt="Assisted signature" className="signature-preview-img" />
                          <button
                            className="signature-remove-btn"
                            onClick={() => clearSignature(setAssistedSignaturePreview, setAssistedSignatureDims)}
                            title="Remove signature"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div
                          className="signature-dropzone"
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={(e) => e.currentTarget.classList.add('drag-over')}
                          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                          onDrop={(e) => {
                            e.currentTarget.classList.remove('drag-over');
                            handleSignatureDrop(e, setAssistedSignaturePreview, setAssistedSignatureDims);
                          }}
                          onClick={() => document.getElementById('assisted-sig-input').click()}
                        >
                          <span className="signature-dropzone-text">Click or drag image here</span>
                          <input
                            id="assisted-sig-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleSignatureSelect(e, setAssistedSignaturePreview, setAssistedSignatureDims)}
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="signatory-date-input"
                        value={assistedDate}
                        onChange={(e) => setAssistedDate(e.target.value)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="signatory-label">Approved By:</span>
                      <input
                        type="text"
                        className="signatory-name-input"
                        value={approvedName}
                        onChange={(e) => setApprovedName(e.target.value)}
                        placeholder="Enter name..."
                      />
                    </td>
                    <td>
                      {approvedSignaturePreview ? (
                        <div className="signature-preview-wrap">
                          <img src={approvedSignaturePreview} alt="Approved signature" className="signature-preview-img" />
                          <button
                            className="signature-remove-btn"
                            onClick={() => clearSignature(setApprovedSignaturePreview, setApprovedSignatureDims)}
                            title="Remove signature"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div
                          className="signature-dropzone"
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={(e) => e.currentTarget.classList.add('drag-over')}
                          onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                          onDrop={(e) => {
                            e.currentTarget.classList.remove('drag-over');
                            handleSignatureDrop(e, setApprovedSignaturePreview, setApprovedSignatureDims);
                          }}
                          onClick={() => document.getElementById('approved-sig-input').click()}
                        >
                          <span className="signature-dropzone-text">Click or drag image here</span>
                          <input
                            id="approved-sig-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleSignatureSelect(e, setApprovedSignaturePreview, setApprovedSignatureDims)}
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="signatory-date-input"
                        value={approvedDate}
                        onChange={(e) => setApprovedDate(e.target.value)}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
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
        )}
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
              <p className="preview-disclaimer">
                Note: This preview does not accurately show the actual document. This is to view if your data is correct. Please download the file for the actual result.
              </p>
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

      {/* POST-UPLOAD SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-header">
              <h2>Action Plan Submitted</h2>
            </div>
            <div className="modal-body success-body">
              <p className="success-message">
                Your Action Plan has been successfully submitted.
              </p>
              <p className="success-subtext">
                Please wait for the CSC RO X for any updates.
              </p>
            </div>
            <div className="modal-actions success-actions">
              <button
                className="okay-btn"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/dashboard-u');
                }}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VALIDATION ERROR MODAL */}
      {showValidationModal && (
        <div className="modal-overlay" onClick={() => setShowValidationModal(false)}>
          <div className="modal-content warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Missing Required Fields</h2>
              <button className="modal-close" onClick={() => setShowValidationModal(false)}>
                <img src={closeIcon} alt="Close" width="20" height="20" />
              </button>
            </div>
            <div className="modal-body warning-body">
              <p className="warning-text">
                Please fill in the following fields before uploading:
              </p>
              <ul className="validation-error-list">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="warning-subtext">
                You can still generate a preview or download the file, but all fields must be completed to submit to Google Drive.
              </p>
            </div>
            <div className="modal-actions warning-actions">
              <button className="cancel-btn" onClick={() => setShowValidationModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCKED STATE: Action Plan already submitted */}
      {showLockModal && (
        <LockModal
          isOpen={showLockModal}
          onClose={() => {
            setShowLockModal(false);
            navigate('/dashboard-u');
          }}
          customMessage={{
            title: 'Action Plan Submitted',
            message: 'Your Action Plan has been successfully submitted.',
            subtext: 'Please wait for the CSC RO X for any updates.'
          }}
        />
      )}
    </main>
  );
}
