import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/user-layout.css';
import '../../css/uprofile.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import fileIcon from '../../assets/file.svg';
import profileIcon from '../../assets/profile.svg';

import addSquare from '../../assets/add-square.svg';
import removeSquare from '../../assets/min-square.svg';

import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

export default function Uprofile() {

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
              <div className="nav-item nav-my-profile active">
                <img src={profileIcon} alt="My Profile" width="15" height="15" className="deep-blue-filter"/>
                Agency Profile
              </div>
            </nav>
          </div>
        </aside>

        <main className="profile-main-content">
          <div className="profile-main-content-header">
            <h1 id="profile-main-content-title">Agency Profile</h1>
          </div>
          <div className="profile-container">
            <p className="profile-agency-title">Agency Details</p>

            <form className="profile-agency-details">
              <div className="profile-input-container">
                <div className="profile-group">
                  <label htmlFor="agency-name" className="profile-label">Agency Name</label>
                  <input 
                    type="text" 
                    className="profile-input"
                    id="agency-name"
                    name="agency-name"
                    placeholder="Enter your Agency Name"
                    required />
                </div>
                <div className="profile-group">
                  <label htmlFor="agency-region" className="profile-label">Region</label>
                  <input 
                    type="text" 
                    className="profile-input"
                    id="agency-region"
                    name="agency-region"
                    placeholder="Enter your region"
                    required />
                </div>
                <div className="profile-group">
                  <label htmlFor="agency-sector" className="profile-label">Sector</label>
                  <input 
                    type="text" 
                    className="profile-input"
                    id="agency-sector"
                    name="agency-sector"
                    placeholder="Enter your sector"
                    required />
                </div>
                <div className="profile-group">
                  <label htmlFor="agency-status" className="profile-label">Current Agency Status</label>
                  <input 
                    type="text" 
                    className="profile-input"
                    id="agency-status"
                    name="agency-status"
                    placeholder="Enter your status"
                    required />
                </div>
                <div className="profile-group">
                  <label htmlFor="agency-reso-status" className="profile-label">CSC Resolution Status</label>
                  <input 
                    type="text" 
                    className="profile-input"
                    id="agency-reso-status"
                    name="agency-reso-status"
                    placeholder="Enter your status"
                    required />
                </div>
              </div>
            </form>

            <p className="profile-agency-title">Agency Head Details</p>
            <form className="profile-agency-head">
              <div className="profile-input-container">
                <div className="profile-group">
                  <label htmlFor="agency-head-name" className="profile-label">Agency Head</label>
                  <input 
                      type="text" 
                      className="profile-input"
                      id="agency-head-name"
                      name="agency-head-name"
                      placeholder="Enter the name of the Agency Head"
                      required />
                </div>
                <div className="profile-group">
                  <label htmlFor="agency-head-position" className="profile-label">Position Title</label>
                  <input 
                      type="text" 
                      className="profile-input"
                      id="agency-head-position"
                      name="agency-head-position"
                      placeholder="Enter their Position Title"
                      required />
                </div>
              </div>
            </form>
            <p className="profile-agency-title">HRM Officers</p>
            <form className="profile-hrm-officers">
              <div className="profile-input-container hrm-officer">
                <div className="profile-officer-info">
                  <div className="profile-group">
                    <label htmlFor="hrm-officer-name" className="profile-label">Name of Officer</label>
                    <input 
                        type="text" 
                        className="profile-input hrm-officer"
                        id="hrm-officer-name"
                        name="hrm-officer-name"
                        placeholder="Enter officer's name"
                        required />
                  </div>
                  <div className="profile-group">
                    <label htmlFor="hrm-officer-number" className="profile-label">Contact Number</label>
                    <input 
                        type="text" 
                        className="profile-input hrm-officer"
                        id="hrm-officer-number"
                        name="hrm-officer-number"
                        placeholder="Enter their contact number"
                        required />
                  </div>
                  <div className="profile-group">
                    <label htmlFor="hrm-officer-email" className="profile-label">Email Address</label>
                    <input 
                        type="email" 
                        className="profile-input hrm-officer"
                        id="hrm-officer-email"
                        name="hrm-officer-email"
                        placeholder="Enter their email"
                        required />
                  </div>
                  <div className="profile-group">
                    <label htmlFor="hrm-officer-position" className="profile-label">Position Title</label>
                    <input 
                        type="text" 
                        className="profile-input hrm-officer"
                        id="hrm-officer-position"
                        name="hrm-officer-position"
                        placeholder="Enter their position title"
                        required />
                  </div>
                  <div className="profile-group">
                    <label htmlFor="hrm-officer-status" className="profile-label">Employment Status</label>
                    <input 
                        type="text" 
                        className="profile-input hrm-officer"
                        id="hrm-officer-status"
                        name="hrm-officer-status"
                        placeholder="Enter their current status"
                        required />
                  </div>
                  <div className="profile-officer-addremove">
                    <img src={addSquare} width="35" height="35" alt="Add Officer" className="profile-officer-add grey-filter" />
                    <img src={removeSquare} width="35" height="35"alt="Remove Officer" className="profile-officer-remove disable grey-filter" />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}