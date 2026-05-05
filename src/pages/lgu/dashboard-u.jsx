import '../../css/user-layout.css';
import '../../css/udashboard.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import addCircleIcon from '../../assets/add-circle.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import profileIcon from '../../assets/profile.svg';


import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';


export default function Udashboard() {

  /* Date and Time */
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour12: false,
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' });
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /* Navigation */
  const nav = useNavigate();

  async function logout() {
      await signOut(auth);
      nav('/');
  }

  const handleAddAssessment = () => {
    nav('/upload-u');
  };

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
                <button id="btn-sign-out" onClick={logout}>Sign Out</button>
            </div>
        </header>
      
      <div className="dashboard-layout">
        <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
          <div className="sidebar-section">
            <p className="sidebar-label">HOME</p>
            <nav>
              <div className="nav-item active">
                <img src={dashboardIcon} alt="Dashboard" width="30" height="30" className="deep-blue-filter"/>
                Dashboard
              </div>
            </nav>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">FILE MANAGEMENT</p>
            <nav>
              <div className="nav-item nav-item-upload" onClick={() => nav('/upload-u')}>
                <img src={addFolderIcon} alt="Add Folder" width="20" height="20" className="deep-blue-filter"/>
                Upload New File
              </div>
              <div className="nav-item nav-view-files" onClick={() => nav('/view-u')}>
                <img src={folderIcon} alt="View Files" width="20" height="20" className="deep-blue-filter"/>
                View Your Files
              </div>
            </nav>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">PROFILE</p>
            <nav>
              <div className="nav-item nav-my-profile" onClick={() => nav('/profile-u')}>
                <img src={profileIcon} alt="My Profile" width="15" height="15" className="deep-blue-filter"/>
                Agency Profile
              </div>
            </nav>
          </div>
        </aside>

        <main className="main-content">
          <div className="main-content-header">
            <h1 id="main-content-title">Welcome back, {auth.currentUser?.displayName || 'Agency User'}</h1>
            <button className="new-submission-btn" onClick={handleAddAssessment}>
              <img src={addCircleIcon} alt="Add" width="25" height="25" className='white-filter'/>
              Add Assessment
            </button>
          </div>
          
          <div className="main-content-container">
            <div className="stat-tracker stat-container">
              <div className="tracker">
                <div className="tracker-steps">
                  <span className={`circle ${currentStep >= 1 ? 'active' : ''}`}>1</span>
                  <span className={`circle ${currentStep >= 2 ? 'active' : ''}`}>2</span>
                  <span className={`circle ${currentStep >= 3 ? 'active' : ''}`}>3</span>
                  <span className={`circle ${currentStep >= 4 ? 'active' : ''}`}>4</span>
                  <div className="progress-bar">
                    <span 
                      className="indicator" 
                      style={{ width: `${progressWidth}%` }}
                    ></span>
                  </div>
                </div>
                <p>Assessment Progress: <span className="progress-status"> {stepLabels[currentStep]}</span></p>
                {/* Dev Button Functionality for Testing */}
                
                {/* <div className="tracker-debug-buttons">
                  <button id="prev" onClick={handlePrev} disabled={currentStep === 1}>
                    Previous
                  </button>
                  <button id="next" onClick={handleNext} disabled={currentStep === totalSteps}>
                    Next
                  </button>
                </div> */} 

              </div>
            </div>
            <div className="stat-time stat-container">
              <div className="stat-time-clock">{formatTime(time)}</div>
              <div className="stat-time-date">{formatDate(time)}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}