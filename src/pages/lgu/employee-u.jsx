import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uemployee.css';

import editIcon from '../../assets/edit.svg'
import addSquare from '../../assets/add-square.svg';
import removeSquare from '../../assets/min-square.svg';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAgencyData } from '../../hooks/useAgencyData';
import { logActivity } from '../../firebase/activityLog';

export default function Uemployee() {

  // Date Restrictions
  const minDate = "2011-01-01";
  const maxDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 2);
    return date.toISOString().split('T')[0];
  })();

  // Table Rows and Columns
  const categories = [
    "1st Level",
    "2nd Level Professional/Technical",
    "2nd Level Executive/Managerial  (SG-25 and above)",
    "3rd Level (Presidential Appointees)"
  ];

  const statusTypes = [
    "Permanent", "Temporary", "Contractuals", 
    "Casuals", "Co-Terminus", "Elective", "Job Order"
  ];

  const totalRequiredCells = categories.length * statusTypes.length * 2;

  const [tableData, setTableData] = useState({});
  const [dataAsOf, setDataAsOf] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [hrmSummary, setHrmSummary] = useState({
    permanent: '',
    tempContractCasual: '',
    coterminusOthers: ''
  });
  const [personnelComplement, setPersonnelComplement] = useState({
    firstLevel: '',
    secondLevelPT: '',
    secondLevelEM: '',
    thirdLevelPA: ''
  });

  const filledCells = Object.keys(tableData).length;

  // Fetching data from Firebase/Firestore via hook
  const { employees, loading } = useAgencyData();
  
  useEffect(() => {
    if (employees) {
      setTableData(employees.employeeData || {});
      setDataAsOf(employees.dataAsOf || '');
      setHrmSummary({
        permanent: employees.hrmSummary?.permanent ?? '',
        tempContractCasual: employees.hrmSummary?.tempContractCasual ?? '',
        coterminusOthers: employees.hrmSummary?.coterminusOthers ?? ''
      });
      setPersonnelComplement({
        firstLevel: employees.personnelComplement?.firstLevel ?? '',
        secondLevelPT: employees.personnelComplement?.secondLevelPT ?? '',
        secondLevelEM: employees.personnelComplement?.secondLevelEM ?? '',
        thirdLevelPA: employees.personnelComplement?.thirdLevelPA ?? ''
      });
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [employees]);

  // Saving to Firebase Functionality
  const handleSaveEmployeeInfo = async () => {
    const user = auth.currentUser;
    const selectedDate = new Date(dataAsOf);
    const minAllowed = new Date("2011-01-01");
    const maxAllowed = new Date();
    maxAllowed.setFullYear(maxAllowed.getFullYear() + 2);

    if (selectedDate < minAllowed || selectedDate > maxAllowed) {
      setMessage({ 
        text: "Please select a date between 2011 and 2 years from now.", 
        type: "error" 
      });
      return;
    }
    if (!user) {
      setMessage({ text: "You must be logged in to save data.", type: "error" });
      return;
    }

    if (!dataAsOf) {
      setMessage({ text: "Please select a 'Data as of' date.", type: "error" });
      return;
    }

    if (filledCells < totalRequiredCells) {
        setMessage({ 
            text: `Please fill in all cells. (${filledCells}/${totalRequiredCells} completed)`, 
            type: "error" 
        });
        return;
    }

    const hrmFields = ['permanent', 'tempContractCasual', 'coterminusOthers'];
    const complementFields = ['firstLevel', 'secondLevelPT', 'secondLevelEM', 'thirdLevelPA'];
    
    const isHrmComplete = hrmFields.every(f => hrmSummary[f] !== '');
    const isComplementComplete = complementFields.every(f => personnelComplement[f] !== '');

    if (!isHrmComplete || !isComplementComplete) {
      setMessage({ text: "Please fill in all HRM Office and Personnel Complement fields.", type: "error" });
      return;
    }

    const allZero = Object.values(tableData).every(val => val === 0);
    if (allZero) {
        const confirmSave = window.confirm("All employee values are 0. Are you sure you want to save?");
        if (!confirmSave) return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, "agencyEmployees", user.uid);

      await setDoc(docRef, {
        uid: user.uid,
        dataAsOf: dataAsOf,
        lastUpdated: serverTimestamp(),
        
        employeeData: tableData,

        hrmSummary: {
          permanent: Number(hrmSummary.permanent),
          tempContractCasual: Number(hrmSummary.tempContractCasual),
          coterminusOthers: Number(hrmSummary.coterminusOthers)
        },

        personnelComplement: {
          firstLevel: Number(personnelComplement.firstLevel),
          secondLevelPT: Number(personnelComplement.secondLevelPT),
          secondLevelEM: Number(personnelComplement.secondLevelEM),
          thirdLevelPA: Number(personnelComplement.thirdLevelPA)
        }
      });

      await logActivity({
        userId: user.uid,
        userEmail: user.email,
        userRole: 'u',
        action: 'UPDATE_EMPLOYEES',
        details: { dataAsOf },
        message: `Agency user ${user.email} updated employee data`
      });

      setMessage({ text: "All employee information and summaries saved!", type: "success" });
    } catch (error) {
      console.error("Error saving document:", error);
      setMessage({ text: "Failed to save information. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  // Table Functionality
  const sanitizeCellValue = (value) => {
    const numValue = parseInt(value);
    return isNaN(numValue) || numValue < 0 ? 0 : numValue;
  };

  const handleInputChange = (category, status, gender, value) => {
    const key = `${category}-${status}-${gender}`;
    setTableData(prev => ({
      ...prev,
      [key]: sanitizeCellValue(value)
    }));
  };

  const handleHrmChange = (field, value) => {
    const num = parseInt(value);
    setHrmSummary(prev => ({
      ...prev,
      [field]: value === '' ? '' : (isNaN(num) || num < 0 ? 0 : num)
    }));
  };

  const handleComplementChange = (field, value) => {
    const num = parseInt(value);
    setPersonnelComplement(prev => ({
      ...prev,
      [field]: value === '' ? '' : (isNaN(num) || num < 0 ? 0 : num)
    }));
  };

  if (loading) {
    return <div className="loading-screen">Loading Employee Data...</div>;
  }

  return (
      <main className="employee-main-content">
          <div className="employee-main-content-header">
              <h1 id="employee-main-content-title">Employee Profile</h1>
              <button 
                  className={`edit-employee-profile ${isEditing ? 'active' : ''}`} 
                  onClick={() => !isEditing && setIsEditing(true)}
              > 
                  <img src={editIcon} alt="Edit" width="25" height="25" className="white-filter"/>
                  {isEditing ? 'Editing...' : 'Edit Employee Profile'}
              </button>
          </div>
          <div className="employee-container">
            {message.text && (
                <div className={`profile-message-banner ${message.type}`}>
                  {message.text}
                </div>
            )}
            <p className="profile-employee-title">No. of Employees in HRM office:</p>
            <div className="profile-employee-input-container sum">
              <div className="profile-employee-group">
                <label className="employee-label">Permanent</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleHrmChange('permanent', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={hrmSummary.permanent ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
              <div className="profile-employee-group">
                <label className="employee-label">Temporary, Contractual, Casual</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleHrmChange('tempContractCasual', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={hrmSummary.tempContractCasual ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
              <div className="profile-employee-group">
                <label className="employee-label">Co-Terminus, Others</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleHrmChange('coterminusOthers', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={hrmSummary.coterminusOthers ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
            </div>

            <p className="profile-employee-title">Agency Personnel Complement:</p>
            <div className="profile-employee-input-container sum">
              <div className="profile-employee-group">
                <label className="employee-label">1st Level</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleComplementChange('firstLevel', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={personnelComplement.firstLevel ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
              <div className="profile-employee-group">
                <label className="employee-label">2nd Level Professional/Technical</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleComplementChange('secondLevelPT', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={personnelComplement.secondLevelPT ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
              <div className="profile-employee-group">
                <label className="employee-label">2nd Level Executive/Managerial (SG-25 and above)</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleComplementChange('secondLevelEM', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={personnelComplement.secondLevelEM ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
              <div className="profile-employee-group">
                <label className="employee-label">3rd Level (Presidential Appointees)</label>
                <input 
                  type="number" 
                  className="summary-input"
                  min="0"
                  onChange={(e) => handleComplementChange('thirdLevelPA', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  value={personnelComplement.thirdLevelPA ?? ''}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="employee-main-content-header table">
              <p className="profile-employee-title">Status of Employment:</p>
              <form className="profile-employee-group date-section">
                <label className="employee-label">Data as of:</label>
                <input 
                  type="date" 
                  className="employee-date-input"
                  value={dataAsOf}
                  min={minDate}
                  max={maxDate}
                  onChange={(e) => setDataAsOf(e.target.value)}
                  disabled={!isEditing}
                  required />
              </form>
            </div>
            <form className="profile-employee-details">
              <table className="employee-status-table">
                <thead>
                  <tr>
                    <th rowSpan="2">Category of Grouping</th>
                    {statusTypes.map(type => <th key={type} colSpan="2">{type}</th>)}
                  </tr>
                  <tr>
                    {statusTypes.map(type => (
                      <React.Fragment key={type}>
                        <th>M</th><th>F</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat}>
                      <td className="category-label">{cat}</td>
                      {statusTypes.map(status => (
                        <React.Fragment key={status}>
                          <td>
                            <input 
                              type="number" 
                              className="table-input" 
                              min="0"
                              onChange={(e) => handleInputChange(cat, status, 'M', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              required
                              placeholder="0"
                              value={tableData[`${cat}-${status}-M`] ?? ''}
                              disabled={!isEditing}
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="table-input" 
                              min="0"
                              onChange={(e) => handleInputChange(cat, status, 'F', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              required
                              placeholder="0"
                              value={tableData[`${cat}-${status}-F`] ?? ''}
                              disabled={!isEditing}
                            />
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </form>
            {isEditing && (
              <div className="employee-actions">
                <button 
                  className="employee-save-btn" 
                  onClick={handleSaveEmployeeInfo}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="spinner"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Employee Information"
                  )}
                </button>
              </div>
            )}
          </div>
      </main>
  );
}