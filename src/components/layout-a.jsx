import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../css/admin/admin-layout.css';
import hamIcon from '../assets/hamburger.svg';
import dashboardIcon from '../assets/dashboard.svg';
import reviewIcon from '../assets/review.svg';
import editIcon from '../assets/edit.svg';

import folderIcon from '../assets/folder.svg';
import deleteIcon from '../assets/rejected.svg';
import notificationIcon from '../assets/notification.svg';
import logoutIcon from '../assets/logout.svg';
import contactIcon from '../assets/contact.svg';
import profileIcon from '../assets/profile.svg';

import NotificationBell from '../components/NotificationBell';
import Modal from '../components/Modal';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { removeSession } from '../firebase/collections/activeSessions';

export default function Alayout() {
    const nav = useNavigate();
    const location = useLocation();

    async function logout() {
        try {
            if (auth.currentUser) {
                await removeSession(auth.currentUser.uid);
            }
            await signOut(auth);
            nav('/');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    }

    /* Side Bar Functionality */
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [showSignOutModal, setShowSignOutModal] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    /* Dynamic Header Title Functionality */
    const getPageTitle = (path) => {
        switch (path) {
            case '/dashboard-a': return 'Admin Dashboard';
            case '/activity-logs-a': return 'Activity Logs';
            // case '/test-page-a': return 'Test Page';
            case '/drive-browser-a': return 'Google Drive Browser';
            case '/deletion-requests-a': return 'Deletion Requests';
            case '/send-notification-a': return 'Send Agency Notification';
            case '/active-users-a': return 'Active Users';
            case '/contact-a': return 'Contact Us';
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
                    <NotificationBell user={auth.currentUser} />
                    <div className="divider"></div>
                    <div className="who-am-i-box">
                        <p id="who-am-i">{auth.currentUser?.email}</p>
                        <p id="who-am-i-name">System Administrator</p>
                    </div>
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

                    <div className="sidebar-section">
                        <p className="sidebar-label">MONITORING</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-activity-logs" to="/activity-logs-a">
                                <img src={reviewIcon} alt="Activity Logs" width="20" height="20" className="deep-blue-filter"/>
                                Activity Logs
                            </NavLink>
                            <NavLink className="nav-item-admin nav-active-users" to="/active-users-a">
                                <img src={profileIcon} alt="Active Users" width="20" height="20" className="deep-blue-filter"/>
                                Active Users
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
                    */}

                    <div className="sidebar-section">
                        <p className="sidebar-label">FILE MANAGEMENT</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-drive-browser" to="/drive-browser-a">
                                <img src={folderIcon} alt="Drive Browser" width="20" height="20" className="deep-blue-filter"/>
                                Drive Browser
                            </NavLink>
                        </nav>
                    </div>

                    <div className="sidebar-section">
                        <p className="sidebar-label">REVIEWS</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-deletion-requests" to="/deletion-requests-a">
                                <img src={deleteIcon} alt="Deletion Requests" width="20" height="20" className="deep-blue-filter"/>
                                Deletion Requests
                            </NavLink>
                        </nav>
                    </div>

                    <div className="sidebar-section">
                        <p className="sidebar-label">COMMUNICATIONS</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-send-notification" to="/send-notification-a">
                                <img src={notificationIcon} alt="Send Notification" width="20" height="20" className="deep-blue-filter"/>
                                Send Notification
                            </NavLink>
                        </nav>
                    </div>

                    {/* <div className="sidebar-section">
                        <p className="sidebar-label">DEVELOPMENT</p>
                        <nav>
                            <NavLink className="nav-item-admin nav-test-page" to="/test-page-a">
                                <img src={editIcon} alt="Test Page" width="20" height="20" className="deep-blue-filter"/>
                                Test Page
                            </NavLink>
                        </nav>
                    </div> */}


                    <div className="sidebar-section sign-out-section">
                        <nav>
                            <NavLink className="nav-item-admin nav-contact-us" to="/contact-a">
                                <img src={contactIcon} alt="Contact Us" width="20" height="20" className="deep-blue-filter"/>
                                Contact Us
                            </NavLink>
                        </nav>
                        <div className="sidebar-footer-divider"></div>
                        <button className="nav-item-admin nav-sign-out" onClick={() => setShowSignOutModal(true)}>
                            <img src={logoutIcon} alt="Sign Out" width="20" height="20" className="deep-blue-filter"/>
                            Sign Out
                        </button>
                    </div>
                </aside>
                <main className="layout-content-area">
                    <Outlet />
                </main>
            </div>

            <Modal
                isOpen={showSignOutModal}
                onClose={() => setShowSignOutModal(false)}
                title="Sign Out"
                variant="warning"
                actions={
                    <>
                        <button className="modal-btn modal-btn-secondary" onClick={() => setShowSignOutModal(false)}>
                            Cancel
                        </button>
                        <button className="modal-btn modal-btn-danger" onClick={logout}>
                            Sign Out
                        </button>
                    </>
                }
            >
                Are you sure you want to sign out?
            </Modal>
        </div>
    );
}
