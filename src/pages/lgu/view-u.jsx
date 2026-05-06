import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/user-layout.css';
import '../../css/uview.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';
import dashboardIcon from '../../assets/dashboard.svg';
import addFolderIcon from '../../assets/add-folder.svg';
import folderIcon from '../../assets/folder.svg';
import profileIcon from '../../assets/profile.svg';

import fileIcon from '../../assets/file.svg';
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
  );
}