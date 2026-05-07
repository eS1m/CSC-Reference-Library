import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/user-layout.css';
import '../../css/uupload.css';
import uploadIcon from '../../assets/upload.svg';
import { auth, db } from '../../firebase/config';
import { serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAgencyData } from '../../hooks/useAgencyData';


export default function Uupload() {

  /* File Upload Functionality */
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const nav = useNavigate();

  const { agencyName, isLocked, currentStep } = useAgencyData();

  useEffect(() => {
    if (!isLocked && currentStep !== 3 && currentStep !== 5) {
    }
  }, [isLocked, currentStep]);

  const handleUpload = async (e) => {
    const fileExtension = file.name.split('.').pop();
    const formattedName = `PRIME-HRM Assessment-(${agencyName}).${fileExtension}`;
    if (e) e.stopPropagation();
    if (!file) return;
    if (!agencyName) {
      setUploadStatus("Agency Profile not found. Please complete your profile first.");
      setStatusType("error");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Uploading to Google Drive...");
    setStatusType("");

    const formData = new FormData();
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    formData.append('file', file);
    formData.append('agencyName', agencyName);
    formData.append('fileType', 'Self-Assessment');

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Upload to Drive failed.");

      const driveData = await response.json();
      const submissionData = {
        userId: auth.currentUser.uid,
        agencyName: agencyName,
        fileName: formattedName,
        fileId: driveData.fileId,
        fileUrl: driveData.webViewLink,
        fileType: "Self-Assessment",
        uploadedAt: serverTimestamp(),
        assessmentYear: new Date().getFullYear(),
        status: 'Pending'
      };

      await addDoc(collection(db, "agencySubmissions"), submissionData);
      nav('/dashboard-u');

      setUploadStatus("File successfully uploaded and recorded!");
      setStatusType("success");
      setFile(null);
    } catch (err) {
      console.error(err);
      setUploadStatus("Error: " + err.message);
      setStatusType("error");
    } finally {
      setIsUploading(false);
    }
  };

  /* File input change handler */
  const handleContainerClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const isAssessmentName = /Assessment|PRIME/.test(selectedFile.name);

    if (!isAssessmentName) {
      const confirmWrongName = window.confirm(
        `Warning: This file doesn't look like a Self-Assessment. 
        The official naming convention is 'PRIME-HRM Assessment-(Agency Name)'. 
        Do you want to proceed anyway?`
      );
      if (!confirmWrongName) {
        e.target.value = null; // Clear the input
        setFile(null);
        return;
      }
    }
    
    setFile(selectedFile);
  };

  return (
    <main className="upload-main-content">
          <div className="upload-file-container" onClick={handleContainerClick}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".xlsx, .xls" 
              onChange={(e) => {handleFileChange(e); setUploadStatus("");}} 
              />
            <img 
              src={uploadIcon} 
              alt="Upload File" 
              className="upload-icon grey-filter" 
              width="300" 
              height="300"
              />
            <p className="upload-prompt">
              {file ? `Selected: ${file.name}` : "Drag and drop your self-assessment file here, or click to browse."}
            </p>

            {uploadStatus && (
              <p className={`status-message ${statusType}`}>
                {uploadStatus}
              </p>
            )}
            
            <button className="upload-file-btn" disabled={!file || isUploading}
                onClick={(e) => handleUpload(e)}
            >
              {isUploading ? <div className="spinner"></div> : "Upload File"}
            </button>
          </div>
    </main>
  );
}