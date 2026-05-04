import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/uupload.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import addCircleIcon from '../../assets/add-circle.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import uploadIcon from '../../assets/upload.svg';

import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

export default function Uupload() {

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
                <div className="who-am-i-box">
                    <p id="who-am-i">LGU AGENCY EMAIL</p>
                    <p id="who-am-i-name">LGU AGENCY NAME</p>
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
              <div className="nav-item nav-view-files">
                <img src={folderIcon} alt="View Files" width="20" height="20" className="deep-blue-filter"/>
                View Your Files
              </div>
            </nav>
          </div>
        </aside>

        <main className="upload-main-content">
          <div className="upload-file-container">
            <img src={uploadIcon} alt="Upload File" className="upload-icon grey-filter" width="300" height="300"/>
            <p className="upload-prompt">Drag and drop your self-assessment file here, or click to browse.</p>
          </div>
        </main>
      </div>
    </div>
  );
}