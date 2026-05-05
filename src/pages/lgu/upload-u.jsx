import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/user-layout.css';
import '../../css/uupload.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import addCircleIcon from '../../assets/add-circle.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import uploadIcon from '../../assets/upload.svg';
import profileIcon from '../../assets/profile.svg';


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

    /* Progress Bar Functionality */
    const [currentStep, setCurrentStep] = useState(1);
    const progressWidth = ((currentStep - 1) / (4 - 1)) * 100;
    const totalSteps = 4;

    /* Dev Button Functionality for Testing */
    const handleNext = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const stepLabels = {
    1: "No Self-Assessment File Uploaded",
    2: "Assessment Checking",
    3: "No Action Plan Uploaded",
    4: "Final Review"
  };

  return (
    <div className="user-dashboard-container">
      <header>
            <div className="leftside">
                <div className="hamburger" onClick={toggleSidebar}>
                    <img src={hamIcon} alt="Menu" width="20" height="20" className="white-filter" id="hamburger-icon"/>
                </div>
                <p className='dashboard-title'>Agency Screen</p>
            </div>
            <div className="rightside">
                <div className="who-am-i-box" onClick={() => nav('/profile-u')}>
                    <p id="who-am-i">{auth.currentUser?.email}</p>
                    <p id="who-am-i-name">{auth.currentUser?.displayName || 'Agency User'}</p>
                </div>
                <div className="divider"></div>
                <button id="btn-sign-out" onClick={logout}>
                    Sign Out
                </button>
            </div>
      </header>
      
      <div className="dashboard-layout">
        <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
          <div className="sidebar-section">
            <p className="sidebar-label">HOME</p>
            <nav>
              <div className="nav-item" onClick={() => nav('/dashboard-u')}>
                <img src={dashboardIcon} alt="Dashboard" width="25" height="25" className="deep-blue-filter"/>
                Dashboard
              </div>
            </nav>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">FILE MANAGEMENT</p>
            <nav>
              <div className="nav-item nav-item-upload active">
                <img src={addFolderIcon} alt="Add Folder" width="20" height="20" className="deep-blue-filter"/>
                Upload New File
              </div>
              <div className="nav-item nav-view-files" onClick={() => nav('/view-u')}>
                <img src={folderIcon} alt="View Files" width="20" height="20" className="deep-blue-filter"/>
                View Your Files
              </div>
            </nav>
          </div>

          <div className="sidebar-section" onClick={() => nav('/profile-u')}>
            <p className="sidebar-label">PROFILE</p>
            <nav>
              <div className="nav-item nav-my-profile">
                <img src={profileIcon} alt="My Profile" width="15" height="15" className="deep-blue-filter"/>
                Agency Profile
              </div>
            </nav>
          </div>
        </aside>

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
      </div>
    </div>
  );
}