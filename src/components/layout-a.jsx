import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../css/admin/admin-layout.css';
import hamIcon from '../assets/hamburger.svg';
import dashboardIcon from '../assets/dashboard.svg';

import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

export default function Alayout() {
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
            case '/dashboard-a': return 'Admin Dashboard';
            default: return 'Admin Portal';
        }
    };

    return (
        <div className="user-dashboard-container">
            <header className='admin-header'>
                <div className="leftside">
                    <div className="hamburger" onClick={toggleSidebar}>
                        <img src={hamIcon} alt="Menu" width="20" height="20" className="white-filter" id="hamburger-icon"/>
                    </div>
                    <p className='dashboard-title'>{getPageTitle(location.pathname)}</p>
                </div>
                <div className="rightside">
                    <div 
                        className="who-am-i-box" 
                        onClick={() => nav('/profile-a')} 
                        style={{ cursor: 'pointer' }}
                    >
                        <p id="who-am-i">{auth.currentUser?.email}</p>
                        <p id="who-am-i-name">System Administrator</p>
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
                            <NavLink className="nav-item-admin nav-dashboard-admin" to="/dashboard-a">
                                <img src={dashboardIcon} alt="Dashboard" width="20" height="20" className="deep-blue-filter"/>
                                Dashboard
                            </NavLink>
                        </nav>
                    </div>
        
                    {/* Future admin routes — uncomment as pages are built */}
                    {/*
                    <div className="sidebar-section">
                        <p className="sidebar-label">FILE MANAGEMENT</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-review-files" to="/review-a">
                                <img src={reviewIcon} alt="Review" width="20" height="20" className="deep-blue-filter"/>
                                Review Submissions
                            </NavLink>
                            <NavLink className="nav-item-admin nav-approved-files" to="/approved-a">
                                <img src={approvedIcon} alt="Approved" width="20" height="20" className="deep-blue-filter"/>
                                Approved Files
                            </NavLink>
                            <NavLink className="nav-item-admin nav-rejected-files" to="/rejected-a">
                                <img src={rejectedIcon} alt="Rejected" width="20" height="20" className="deep-blue-filter"/>
                                Rejected Files
                            </NavLink>
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">PROFILE</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-admin-profile" to="/profile-a">
                                <img src={profileIcon} alt="My Profile" width="20" height="20" className="deep-blue-filter"/>
                                Admin Profile
                            </NavLink>
                        </nav>
                    </div>
                    */}
                </aside>
                <main className="layout-content-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
