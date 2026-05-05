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

import editIcon from '../../assets/edit.svg'
import addSquare from '../../assets/add-square.svg';
import removeSquare from '../../assets/min-square.svg';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';import { signOut } from 'firebase/auth';

export default function Uprofile() {
  /* Static Fields */
  const [agencyData, setAgencyData] = useState({
    agencyName: '',
    region: '',
    sector: '',
    status: '',
    resolutionStatus: '',
    headName: '',
    headDesignation: ''
  });

  const [hrmOfficers, setHrmOfficers] = useState([
    { id: Date.now(), name: '', number: '', email: '', position: '', status: '' }
  ]);

  /* Fetching of Firestore Data */
  useEffect(() => {
  const fetchProfile = async () => {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "agencyProfiles", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setAgencyData({
          agencyName: data.agencyDetails.agencyName || '',
          region: data.agencyDetails.region || '',
          sector: data.agencyDetails.sector || '',
          status: data.agencyDetails.status || '',
          resolutionStatus: data.agencyDetails.resolutionStatus || '',
          headName: data.headDetails.name || '',
          headDesignation: data.headDetails.designation || ''
        });
        setHrmOfficers(data.hrmOfficers || []);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
    }
  };
  fetchProfile();
}, []);

  /* Editing State */
  const [isEditing, setIsEditing] = useState(false);

  /* Message State */
  const [message, setMessage] = useState({ text: '', type: '' });

  /* Loading State */
  const [isSaving, setIsSaving] = useState(false);

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

  /* Officer Adding Removing Functionality */
  const addOfficer = () => {
    setHrmOfficers([
      ...hrmOfficers,
      { id: Date.now(), name: '', number: '', email: '', position: '', status: '' }
    ]);
  };

  const removeOfficer = (id) => {
    if (hrmOfficers.length > 1) {
      setHrmOfficers(hrmOfficers.filter(officer => officer.id !== id));
    }
  };

  const handleInputChange = (id, field, value) => {
    const updatedOfficers = hrmOfficers.map(off => 
      off.id === id ? { ...off, [field]: value } : off
    );
    setHrmOfficers(updatedOfficers);
  };

  /* Saving Agency Profile Functionality */
  const handleSaveAll = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    const requiredIds = [
        'agency-name', 'agency-region', 'agency-sector', 
        'agency-status', 'agency-reso-status', 
        'head-name', 'head-designation'
    ];

    for (const id of requiredIds) {
        const element = document.getElementById(id);
        if (!element || !element.value.trim()) {
            alert(`Please fill out the ${element?.previousSibling?.innerText || id} field.`);
            element?.focus();
            return;
        }
    }

    const isOfficersIncomplete = hrmOfficers.some(off => 
        !off.name.trim() || !off.position.trim() || !off.email.trim()
    );

    if (isOfficersIncomplete) {
        alert("Please complete all HRM Officer details or remove empty rows.");
        return;
    }

    setIsSaving(true);

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save your profile.");
        return;
    }

    try {
        const agencyData = {
            agencyName: document.getElementById('agency-name').value,
            region: document.getElementById('agency-region').value,
            sector: document.getElementById('agency-sector').value,
            status: document.getElementById('agency-status').value,
            resolutionStatus: document.getElementById('agency-reso-status').value,
        };

        const headData = {
            name: document.getElementById('head-name')?.value || '',
            designation: document.getElementById('head-designation')?.value || '',
        };

        const masterProfile = {
            uid: user.uid,
            email: user.email,
            agencyDetails: agencyData,
            headDetails: headData,
            hrmOfficers: hrmOfficers,
            lastUpdated: serverTimestamp()
        };

        await setDoc(doc(db, "agencyProfiles", user.uid), masterProfile, { merge: true });

        setMessage({ text: "Profile updated successfully!", type: 'success' });
        setIsEditing(false);
    } catch (error) {
        setMessage({ text: "Failed to save profile. Please try again.", type: 'error' });
    } finally {
        setIsSaving(false);
    }
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
            <button 
                className={`edit-agency-profile ${isEditing ? 'active' : ''}`}
                onClick={() => setIsEditing(true)}
              > 
                <img src={editIcon} alt="Edit" width="25" height="25" className="white-filter"/>
                Edit Agency Profile 
            </button>
          </div>
          <div className="profile-container">
            {message.text && (
                <div className={`profile-message-banner ${message.type}`}>
                    {message.text}
                </div>
            )}

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
                    value={agencyData.agencyName}
                    onChange={(e) => setAgencyData({...agencyData, agencyName: e.target.value})}
                      disabled={!isEditing}
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
                    value={agencyData.region}
                    onChange={(e) => setAgencyData({...agencyData, agencyRegion: e.target.value})}
                      disabled={!isEditing}
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
                    value={agencyData.sector}
                    onChange={(e) => setAgencyData({...agencyData, agencySector: e.target.value})}
                      disabled={!isEditing}
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
                    value={agencyData.status}
                    onChange={(e) => setAgencyData({...agencyData, agencySector: e.target.value})}
                      disabled={!isEditing}
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
                    value={agencyData.resolutionStatus}
                    onChange={(e) => setAgencyData({...agencyData, resolutionStatus: e.target.value})}
                      disabled={!isEditing}
                    placeholder="Enter your status"
                    required />
                </div>
              </div>
            </form>

            <p className="profile-agency-title">Agency Head Details</p>
            <form className="profile-agency-head">
              <div className="profile-input-container">
                <div className="profile-group">
                  <label htmlFor="head-name" className="profile-label">Agency Head</label>
                  <input 
                      type="text" 
                      className="profile-input"
                      id="head-name"
                      name="head-name"
                      value={agencyData.headName}
                      onChange={(e) => setAgencyData({...agencyData, headName: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter the name of the Agency Head"
                      required />
                </div>
                <div className="profile-group">
                  <label htmlFor="head-designation" className="profile-label">Position Title</label>
                  <input 
                      type="text" 
                      className="profile-input"
                      id="head-designation"
                      name="head-designation"
                      value={agencyData.headDesignation}
                      onChange={(e) => setAgencyData({...agencyData, headDesignation: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter their Position Title"
                      required />
                </div>
              </div>
            </form>

            <p className="profile-agency-title">HRM Officers</p>
            <form className="profile-hrm-officers">
              <div className="hrm-officers-scroll-container">
                {hrmOfficers.map((officer, index) => (
                  <div className="profile-input-container hrm-officer" key={officer.id}>
                    <div className="profile-officer-info">
                      <div className="profile-group">
                        <label htmlFor="hrm-officer-name" className="profile-label">Name of Officer</label>
                        <input 
                            type="text" 
                            className="profile-input hrm-officer"
                            id="hrm-officer-name"
                            name="hrm-officer-name"
                            placeholder="Enter officer's name"
                            value={officer.name}
                            onChange={(e) => handleInputChange(officer.id, 'name', e.target.value)}
                            disabled={!isEditing}
                            required />
                      </div>
                      <div className="profile-group">
                        <label htmlFor="hrm-officer-number" className="profile-label">Contact Number</label>
                        <input 
                            type="text" 
                            className="profile-input hrm-officer"
                            id="hrm-officer-number"
                            name="hrm-officer-number"
                            placeholder="Enter their number"
                            value={officer.number}
                            onChange={(e) => handleInputChange(officer.id, 'number', e.target.value)}
                            disabled={!isEditing}
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
                            value={officer.email}
                            onChange={(e) => handleInputChange(officer.id, 'email', e.target.value)}
                            disabled={!isEditing}
                            required />
                      </div>
                      <div className="profile-group">
                        <label htmlFor="hrm-officer-position" className="profile-label">Position Title</label>
                        <input 
                            type="text" 
                            className="profile-input hrm-officer"
                            id="hrm-officer-position"
                            name="hrm-officer-position"
                            placeholder="Enter their title"
                            value={officer.position}
                            onChange={(e) => handleInputChange(officer.id, 'position', e.target.value)}
                            disabled={!isEditing}
                            required />
                      </div>
                      <div className="profile-group">
                        <label htmlFor="hrm-officer-status" className="profile-label">Employment Status</label>
                        <input 
                            type="text" 
                            className="profile-input hrm-officer"
                            id="hrm-officer-status"
                            name="hrm-officer-status"
                            placeholder="Enter their status"
                            value={officer.status}
                            onChange={(e) => handleInputChange(officer.id, 'status', e.target.value)}
                            disabled={!isEditing}
                            required />
                      </div>
                      <div className={`profile-officer-addremove ${!isEditing ? 'hidden' : ''}`}>
                        <img 
                          src={addSquare} 
                          alt="Add" 
                          className="profile-officer-add grey-filter" 
                          onClick={addOfficer} 
                        />
                        <img 
                          src={removeSquare} 
                          alt="Remove" 
                          className={`profile-officer-remove grey-filter ${hrmOfficers.length === 1 ? 'disable' : ''}`} 
                          onClick={() => removeOfficer(officer.id)} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>   
            </form> 
            <div className="profile-actions">
              {isEditing && (
                <button 
                  className="profile-save-btn" 
                  onClick={handleSaveAll} 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="spinner"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Agency Profile"
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}