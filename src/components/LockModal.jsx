import React from 'react';
import '../css/lock-modal.css';
import lockIcon from '../assets/lock.svg';
import closeIcon from '../assets/close.svg';

export default function LockModal({ isOpen, onClose, currentStep, customMessage }) {
  if (!isOpen) return null;

  const getLockMessage = () => {
    if (customMessage) {
      return customMessage;
    }
    if (currentStep < 3) {
      return {
        title: "Upload Locked",
        message: "Please complete both your Agency and Employee profiles first.",
        subtext: "You need to finish setting up your agency information and employee data before you can upload files."
      };
    }
    return {
      title: "Upload Locked",
      message: "Self-Assessment already uploaded.",
      subtext: "You have already submitted your Self-Assessment. Please proceed to the Action Plan page to generate your next document."
    };
  };

  const { title, message, subtext } = getLockMessage();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lock-modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <img src={closeIcon} alt="Close" width="20" height="20"/>
          </button>
        </div>

        <div className="modal-body lock-body">
          <div className="lock-icon-large">
            <img src={lockIcon} alt="Locked" width="45" height="45" className="grey-filter"/>
          </div>
          <p className="lock-message">{message}</p>
          <p className="lock-subtext">{subtext}</p>
        </div>

        <div className="modal-actions lock-actions">
          <button className="understood-btn" onClick={onClose}>
            Understood
          </button>
        </div>

      </div>
    </div>
  );
}