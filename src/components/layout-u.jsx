import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../css/lgu/user-layout.css';
import hamIcon from '../assets/hamburger.svg';
import dashboardIcon from '../assets/dashboard.svg';
import addFolderIcon from '../assets/add-folder.svg';
import folderIcon from '../assets/folder.svg';
import profileIcon from '../assets/profile.svg';
import employeeIcon from '../assets/employees.svg'
import lockIcon from '../assets/lock.svg'

import LockModal from '../components/LockModal';
import { useAgencyData } from '../hooks/useAgencyData';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

export default function Ulayout() {
    const nav = useNavigate();
    const location = useLocation();

    /* Lock Modal State */
    const [lockModalOpen, setLockModalOpen] = useState(false);

    async function logout() {
        try {
            await signOut(auth);
            nav('/');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }

    /* Side Bar Functionality */
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    /* Upload Restriction Functionality */
    const { isLocked, currentStep, agencyName, loading } = useAgencyData();

    const handleLockedNav = (e) => {
        if (isLocked) {
            e.preventDefault();
            setLockModalOpen(true);
        }
    };

    /* Dynamic Header Title */
    const getPageTitle = (path) => {
        switch (path) {
            case '/dashboard-u': return 'Agency Dashboard';
            case '/upload-u': return 'Upload Documents';
            case '/view-u': return 'Document Library';
            case '/profile-u': return 'Agency Profile';
            case '/employee-u': return 'Employee Information';
            default: return 'Agency Screen';
        }
    };

    if (loading && !agencyName) return null;

    return (
        <div className="user-dashboard-container">
            <header className='user-header'>
                <div className="leftside">
                    <div className="hamburger" onClick={toggleSidebar}>
                        <img src={hamIcon} alt="Menu" width="20" height="20" className="white-filter" id="hamburger-icon"/>
                    </div>
                    <p className='dashboard-title'>{getPageTitle(location.pathname)}</p>
                </div>
                <div className="rightside">
                    <div 
                        className="who-am-i-box" 
                        onClick={() => nav('/profile-u')} 
                        style={{ cursor: 'pointer' }}
                    >
                        <p id="who-am-i">{auth.currentUser?.email}</p>
                        <p id="who-am-i-name">{agencyName || 'Agency User'}</p>
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
                            <NavLink className="nav-item-user nav-dashboard-user" to="/dashboard-u">
                                <img src={dashboardIcon} alt="Dashboard" width="20" height="20" className="deep-blue-filter"/>
                                Dashboard
                            </NavLink>
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">FILE MANAGEMENT</p>
                        <nav>
                            <NavLink 
                                className={`nav-item-user nav-item-upload ${isLocked ? 'nav-locked' : ''}`}
                                to="/upload-u" 
                                onClick={handleLockedNav}
                            >
                                <img src={addFolderIcon} alt="Add Files" width="20" height="20" className="deep-blue-filter"/>
                                Upload New File
                                {isLocked && (
                                    <span className="lock-tag">
                                        <img src={lockIcon} alt="Locked" width="20" height="20" className='grey-filter'/>
                                    </span>
                                )}
                            </NavLink>
                            <NavLink className="nav-item-user nav-view-files" to="/view-u">
                                <img src={folderIcon} alt="View Files" width="20" height="20" className="deep-blue-filter"/>
                                View Your Files
                            </NavLink>
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">PROFILE</p>
                        <nav>
                            <NavLink className="nav-item-user nav-my-profile" to="/profile-u">
                                <img src={profileIcon} alt="My Profile" width="20" height="20" className="deep-blue-filter"/>
                                Agency Profile
                            </NavLink>
                            <NavLink className="nav-item-user nav-employee-profile" to="/employee-u">
                                <img src={employeeIcon} alt="Employee Profile" width="20" height="20" className="deep-blue-filter"/>
                                Employee Profile
                            </NavLink>
                        </nav>
                    </div>
                </aside>
                <main className="layout-content-area">
                    <Outlet />
                </main>
            </div>

            <LockModal 
                isOpen={lockModalOpen} 
                onClose={() => setLockModalOpen(false)} 
                currentStep={currentStep} 
            />
        </div>
    );
}