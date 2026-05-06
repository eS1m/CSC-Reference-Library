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
  );
}