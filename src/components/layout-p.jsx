import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../css/prime/prime-layout.css';
import hamIcon from '../assets/hamburger.svg';
import dashboardIcon from '../assets/dashboard.svg';
import folderIcon from '../assets/folder.svg';
import approvedIcon from '../assets/approved.svg';
import rejectedIcon from '../assets/rejected.svg';

import deleteIcon from '../assets/rejected.svg';
import recommendationsIcon from '../assets/review.svg';
import recommendationIcon from '../assets/recommendation.svg';
import notificationIcon from '../assets/notification.svg';
import logoutIcon from '../assets/logout.svg';
import contactIcon from '../assets/contact.svg';

import NotificationBell from '../components/NotificationBell';
import Modal from '../components/Modal';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { removeSession } from '../firebase/collections/activeSessions';

export default function Playout() {
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
            case '/dashboard-p': return 'CSC RO X Dashboard';
            case '/drive-browser-csc': return 'Drive Browser';
            case '/deletion-requests-p': return 'Deletion Requests';
            case '/recommendations-p': return 'Field Office Monitoring';
            case '/recom-p': return 'Recommendations';
            case '/send-notification-p': return 'Send Agency Notification';
            case '/approved-p': return 'Approved Files';
            case '/rejected-p': return 'Rejected Files';
            case '/contact-p': return 'Contact Us';

            default: return 'CSC RO X Portal';
        }
    };

    return (
        <div className="user-dashboard-container">
            <header className='prime-header'>
                <div className="leftside">
                    <div className="hamburger" onClick={toggleSidebar}>
                        <img src={hamIcon} alt="Menu" width="20" height="20" className="white-filter" id="hamburger-icon"/>
                    </div>
                    <p className='dashboard-title'>{getPageTitle(location.pathname)}</p>
                </div>
                <div className="rightside">
                    <NotificationBell user={auth.currentUser} />
                    <div className="divider"></div>
                    <div 
                        className="who-am-i-box"
                    >
                        <p id="who-am-i">{auth.currentUser?.email}</p>
                        <p id="who-am-i-name">CSC RO X</p>
                    </div>
                </div>
            </header>
              
            <div className="dashboard-layout">
                <aside className={`sidebar ${isSidebarOpen ? '' : 'closed'}`}>
                    <div className="sidebar-section">
                        <p className="sidebar-label">HOME</p>
                        <nav>
                            <NavLink className="nav-item-prime nav-dashboard-prime" to="/dashboard-p">
                                <img src={dashboardIcon} alt="Dashboard" width="20" height="20" className="deep-blue-filter"/>
                                Dashboard
                            </NavLink>
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">FILE MANAGEMENT</p>
                        <nav>
                            <NavLink className="nav-item-prime nav-drive-browser-csc" to="/drive-browser-csc">
                                <img src={folderIcon} alt="Drive Browser" width="20" height="20" className="deep-blue-filter"/>
                                Drive Browser
                            </NavLink>
                            {/* <NavLink className="nav-item-prime nav-approved-files" to="/approved-p">
                                <img src={approvedIcon} alt="Approved" width="20" height="20" className="deep-blue-filter"/>
                                Approved Files
                            </NavLink>
                            <NavLink className="nav-item-prime nav-rejected-files" to="/rejected-p">
                                <img src={rejectedIcon} alt="Rejected" width="20" height="20" className="deep-blue-filter"/>
                                Rejected Files
                            </NavLink> */}
                        </nav>
                    </div>
        
                    <div className="sidebar-section">
                        <p className="sidebar-label">REVIEWS</p>
                        <nav>
                            <NavLink className="nav-item-prime nav-deletion-requests" to="/deletion-requests-p">
                                <img src={deleteIcon} alt="Deletion Requests" width="20" height="20" className="deep-blue-filter"/>
                                Deletion Requests
                            </NavLink>
                            <NavLink className="nav-item-prime nav-recommendations" to="/recommendations-p">
                                <img src={recommendationsIcon} alt="Field Office Monitoring" width="20" height="20" className="deep-blue-filter"/>
                                Field Office Monitoring
                            </NavLink>
                            <NavLink className="nav-item-prime nav-recom" to="/recom-p">
                                <img src={recommendationIcon} alt="Recommendations" width="20" height="20" className="deep-blue-filter"/>
                                Recommendations
                            </NavLink>
                        </nav>
                    </div>

                    <div className="sidebar-section">
                        <p className="sidebar-label">COMMUNICATIONS</p>
                        <nav>
                            <NavLink className="nav-item-prime nav-send-notification" to="/send-notification-p">
                                <img src={notificationIcon} alt="Send Notification" width="20" height="20" className="deep-blue-filter"/>
                                Send Notification
                            </NavLink>
                        </nav>
                    </div>


                    <div className="sidebar-section sign-out-section">
                        <nav>
                            <NavLink className="nav-item-prime nav-contact-us" to="/contact-p">
                                <img src={contactIcon} alt="Contact Us" width="20" height="20" className="deep-blue-filter"/>
                                Contact Us
                            </NavLink>
                        </nav>
                        <div className="sidebar-footer-divider"></div>
                        <button className="nav-item-prime nav-sign-out" onClick={() => setShowSignOutModal(true)}>
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