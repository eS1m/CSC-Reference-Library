import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../css/user-layout.css';
import '../css/prime-layout.css';
import hamIcon from '../assets/hamburger.svg';
import dashboardIcon from '../assets/dashboard.svg';
import reviewIcon from '../assets/review.svg';
import folderIcon from '../assets/folder.svg';
import approvedIcon from '../assets/approved.svg';
import rejectedIcon from '../assets/rejected.svg';
import profileIcon from '../assets/profile.svg';

import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

export default function Playout() {
    const nav = useNavigate();
    const location = useLocation();

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

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    /* Dynamic Header Title Functionality */
    const getPageTitle = (path) => {
        switch (path) {
            case '/dashboard-p': return 'PRIME-HRM Dashboard';
            case '/review-p': return 'Review Submissions';
            case '/approved-p': return 'Approved Files';
            case '/rejected-p': return 'Rejected Files';
            case '/profile-p': return 'PRIME Profile';
            default: return 'PRIME-HRM Portal';
        }
    };

    return (
        <div className="user-dashboard-container">
            <header>
                <div className="leftside">
                    <div className="hamburger" onClick={toggleSidebar}>
                        <img src={hamIcon} alt="Menu" width="20" height="20" className="white-filter" id="hamburger-icon"/>
                    </div>
                    <p className='dashboard-title'>{getPageTitle(location.pathname)}</p>
                </div>
                <div className="rightside">
                    <div 
                        className="who-am-i-box" 
                        onClick={() => nav('/profile-p')} 
                        style={{ cursor: 'pointer' }}
                    >
                        <p id="who-am-i">{auth.currentUser?.email}</p>
                        <p id="who-am-i-name">PRIME-HRM Officer</p>
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
                            <NavLink className="nav-item" to="/dashboard-p">
                                <img src={dashboardIcon} alt="Dashboard" width="25" height="25" className="deep-blue-filter"/>
                                Dashboard
                            </NavLink>
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">FILE MANAGEMENT</p>
                        <nav>
                            <NavLink className="nav-item" to="/review-p">
                                <img src={reviewIcon} alt="Review" width="20" height="20" className="deep-blue-filter"/>
                                Review Submissions
                            </NavLink>
                            <NavLink className="nav-item" to="/approved-p">
                                <img src={approvedIcon} alt="Approved" width="20" height="20" className="deep-blue-filter"/>
                                Approved Files
                            </NavLink>
                            <NavLink className="nav-item" to="/rejected-p">
                                <img src={rejectedIcon} alt="Rejected" width="20" height="20" className="deep-blue-filter"/>
                                Rejected Files
                            </NavLink>
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">PROFILE</p>
                        <nav>
                            <NavLink className="nav-item" to="/profile-p">
                                <img src={profileIcon} alt="My Profile" width="15" height="15" className="deep-blue-filter"/>
                                PRIME Profile
                            </NavLink>
                        </nav>
                    </div>
                </aside>
                <main className="layout-content-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}