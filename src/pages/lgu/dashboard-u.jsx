import React, { useState } from 'react';
import '../../css/udashboard.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import addCircleIcon from '../../assets/add-circle.svg';
import dashboardIcon from '../../assets/dashboard.svg';

export default function Udashboard() {

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
                <button id="btn-sign-out">Sign Out</button>
            </div>
        </header>
      
      <div className="dashboard-layout">
        <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
          <div className="sidebar-section">
            <p className="sidebar-label">HOME</p>
            <nav>
              <div className="nav-item active">
                <img src={dashboardIcon} alt="Dashboard" width="25" height="25" className="deep-blue-filter"/>
                Dashboard
              </div>
            </nav>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">USER MANAGEMENT</p>
            <nav>
              <div className="nav-item">Technicians</div>
              <div className="nav-item">Groups</div>
            </nav>
          </div>
        </aside>

        <main className="main-content">
          <div className="main-content-header">
            <h1 id="main-content-title">Welcome back, LGU AGENCY NAME</h1>
            <button className="new-submission-btn">
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
          </div>
        </main>
      </div>
    </div>
  );
}