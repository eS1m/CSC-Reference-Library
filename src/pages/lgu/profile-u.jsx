import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uprofile.css';

import editIcon from '../../assets/edit.svg'
import addSquare from '../../assets/add-square.svg';
import removeSquare from '../../assets/min-square.svg';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useAgencyData } from '../../hooks/useAgencyData';
import { logActivity } from '../../firebase/activityLog';

export default function Uprofile() {
  const { profile, loading, isAgencyDone } = useAgencyData();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /* Message State */
  const [message, setMessage] = useState({ text: '', type: '' });
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
    if (profile) {
      setAgencyData({
        agencyName: profile.agencyDetails?.agencyName || '',
        region: profile.agencyDetails?.region || '',
        sector: profile.agencyDetails?.sector || '',
        status: profile.agencyDetails?.status || '',
        resolutionStatus: profile.agencyDetails?.resolutionStatus || '',
        headName: profile.headDetails?.name || '',
        headDesignation: profile.headDetails?.designation || ''
      });
      setHrmOfficers(profile.hrmOfficers || [{ id: Date.now(), name: '', number: '', email: '', position: '', status: '' }]);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [profile]);

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

    const isAgencyIncomplete = Object.values(agencyData).some(val => !val || val.trim() === '');
    const isHrmIncomplete = hrmOfficers.some(off => !off.name || off.name.trim() === '');

    if (isAgencyIncomplete || isHrmIncomplete) {
        setMessage({
            text: 'All fields are required. Please fill in missing information before saving.',
            type: 'error'
        });
        window.scrollTo(0, 0);
        return; 
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to save your profile.");
        return;
    }

    setIsSaving(true);

    try {
        const agencyDetails = {
            agencyName: agencyData.agencyName,
            region: agencyData.region,
            sector: agencyData.sector,
            status: agencyData.status,
            resolutionStatus: agencyData.resolutionStatus,
        };

        const headDetails = {
            name: agencyData.headName,
            designation: agencyData.headDesignation,
        };

        const masterProfile = {
            uid: user.uid,
            email: user.email,
            agencyDetails,
            headDetails,
            hrmOfficers,
            lastUpdated: serverTimestamp()
        };

        await setDoc(doc(db, "agencyProfiles", user.uid), masterProfile, { merge: true });

        await logActivity({
          userId: user.uid,
          userEmail: user.email,
          userRole: 'u',
          action: 'UPDATE_PROFILE',
          targetAgencyName: agencyDetails.agencyName,
          details: { agencyName: agencyDetails.agencyName },
          message: `Agency ${agencyDetails.agencyName} updated their profile`
        });

        setMessage({ text: "Profile updated successfully!", type: 'success' });
        setIsEditing(false);
    } catch (error) {
        setMessage({ text: "Failed to save profile. Please try again.", type: 'error' });
    } finally {
        setIsSaving(false);
    }
};

  return (
      <main className="profile-main-content">
          <div className="profile-main-content-header">
              <h1 id="profile-main-content-title">Agency Profile</h1>
              <button 
                  className={`edit-agency-profile ${isEditing ? 'active' : ''}`}
                  onClick={() => !isEditing && setIsEditing(true)}
              > 
                  <img src={editIcon} alt="Edit" width="25" height="25" className="white-filter"/>
                  {isEditing ? 'Editing...' : 'Edit Agency Profile'}
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
                    onChange={(e) => setAgencyData({...agencyData, region: e.target.value})}
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
                    onChange={(e) => setAgencyData({...agencyData, sector: e.target.value})}
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
                    onChange={(e) => setAgencyData({...agencyData, status: e.target.value})}
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
  );
}