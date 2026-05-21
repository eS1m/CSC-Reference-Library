import '../../css/lgu/user-layout.css';
import '../../css/lgu/udashboard.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import addCircleIcon from '../../assets/add-circle.svg';
import { useAgencyWorkflow } from '../../hooks/useAgencyWorkflow';

export default function Udashboard() {
  const nav = useNavigate();
  const { currentStep, agencyName, loading } = useAgencyWorkflow();

  /* Date and Time */
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
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

    /* Progress Bar Functionality */
    const totalSteps = 5;
    const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

    const stepLabels = {
      1: "Agency Profile is empty/not updated",
      2: "Employee Profile is empty/not updated",
      3: "No Self-Assessment file uploaded",
      4: "Self-Assessment uploaded — Generate Action Plan",
      5: "Action Plan generated"
    };

  if (loading) {
    return <div className="loading-screen">Loading Dashboard...</div>;
  }

  return (
        <main className="main-content">
          <div className="main-content-header">
            <h1 id="main-content-title">Welcome back, <b>{agencyName}</b>!</h1>
              <button 
                className="new-submission-btn" 
                onClick={() => nav(currentStep === 4 ? '/action-plan-u' : '/upload-u')}
                disabled={currentStep !== 3 && currentStep !== 4} 
                style={{ 
                  opacity: (currentStep === 3 || currentStep === 4) ? 1 : 0.5,
                  cursor: (currentStep === 3 || currentStep === 4) ? 'pointer' : 'not-allowed'
                }}
              >
                <img src={addCircleIcon} width="30px" height="30px" alt="Add" className="white-filter"/>
                {currentStep === 3 ? "Upload Self-Assessment" : currentStep === 4 ? "Generate Action Plan" : "Complete"}
              </button>
          </div>
          
          <div className="main-content-container">
            <div className="stat-tracker stat-container">
              <div className="tracker">
                <div className="tracker-steps">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <span key={step} className={`circle ${currentStep >= step ? 'active' : ''}`}>
                      {step}
                    </span>
                  ))}
                  <div className="progress-bar">
                    <span className="indicator" style={{ width: `${progressWidth}%` }}></span>
                  </div>
                </div>
                <p>Assessment Progress: <span className="progress-status">{stepLabels[currentStep]}</span></p>
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