import React, { useState } from 'react';
import '../../css/udashboard.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';

export default function Udashboard() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

  return (
    <div className="dashboard-container">
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
              <div className="nav-item active">Dashboard</div>
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
          <h1 id="main-content-title">Dashboard</h1>
        </main>
      </div>
    </div>
  );
}