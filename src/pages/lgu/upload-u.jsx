import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/user-layout.css';
import '../../css/uupload.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import profileIcon from '../../assets/profile.svg';

import addCircleIcon from '../../assets/add-circle.svg';
import uploadIcon from '../../assets/upload.svg';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

export default function Uupload() {

  /* File Upload Functionality */
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
      if (!file) return;

      setIsUploading(true);
      setUploadStatus("");

      const token = sessionStorage.getItem('googleAccessToken');
      
      const formData = new FormData();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      formData.append('file', file);
      formData.append('googleToken', token);

      try {
          const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
          });

          if (response.ok) {
              setUploadStatus("File uploaded successfully to Drive!");
              setStatusType("success");
              setFile(null);
          } else {
              setUploadStatus("Upload failed. Please check your connection.");
              setStatusType("error");
          }
      } catch (err) {
          setUploadStatus("Server error. Please try again later.");
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
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  /* Navigation */
    const nav = useNavigate();
  
    async function logout() {
        await signOut(auth);
        nav('/');
    }

  /* Side Bar Functionality */
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

  return (
    <main className="upload-main-content">
          <div className="upload-file-container" onClick={handleContainerClick}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".xlsx, .xls" onChange={(e) => {handleFileChange(e); setUploadStatus("");}} 
        />
            <img src={uploadIcon} alt="Upload File" className="upload-icon grey-filter" width="300" height="300"/>
            <p className="upload-prompt">
              {file ? `Selected: ${file.name}` : "Drag and drop your self-assessment file here, or click to browse."}
            </p>

            {uploadStatus && (
              <p className={`status-message ${statusType}`}>
                {uploadStatus}
              </p>
            )}
            
            <button className="upload-file-btn" disabled={!file || isUploading}
                onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
            >
              {isUploading ? <div className="spinner"></div> : "Upload File"}
            </button>
          </div>
    </main>
  );
}