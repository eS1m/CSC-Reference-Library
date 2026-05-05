import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/user-layout.css';
import '../../css/uview.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import fileIcon from '../../assets/file.svg';
import profileIcon from '../../assets/profile.svg';


import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';

export default function Uview() {

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

  /* File Fetching Functionality */
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
      const fetchFiles = async () => {
        const token = sessionStorage.getItem('googleAccessToken');

        // DEBUG: Check if token exists in your browser console
        console.log("Current Token:", token);

        if (!token) {
          setIsLoading(false);
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/list-files`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setFiles(data);
        } catch (error) {
          console.error("Error fetching files:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchFiles();
    }, []);

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
              <div className="nav-item nav-view-files active">
                <img src={folderIcon} alt="View Files" width="20" height="20" className="deep-blue-filter"/>
                View Your Files
              </div>
            </nav>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">PROFILE</p>
            <nav>
              <div className="nav-item nav-my-profile">
                <img src={profileIcon} alt="My Profile" width="15" height="15" className="deep-blue-filter"/>
                My Profile
              </div>
            </nav>
          </div>
        </aside>

        <main className="view-main-content">
          <div className="view-header">
            <h1>View Your Files</h1>
          </div>

          {/* Centered Professional Loading Bar */}
          {isLoading && (
            <div className="loading-container">
              <p>Fetching your documents...</p>
              <div className="loading-bar-background">
                <div className="loading-bar-fill"></div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && files.length === 0 && (
            <div className="no-files-found">
              <p>No files found in the shared directory.</p>
            </div>
          )}

          {/* Dynamic File Grid */}
          {!isLoading && files.length > 0 && (
            <div className="current-files-found">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="file-block" 
                  onClick={() => window.open(file.webViewLink, '_blank')}
                >
                  <img src={fileIcon} alt="File" width="80" height="80" className="deep-blue-filter"/>
                  <p>{file.name}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}