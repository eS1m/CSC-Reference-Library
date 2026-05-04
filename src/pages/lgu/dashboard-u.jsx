import React from 'react';
import '../../css/udashboard.css';
import hamIcon from '../../assets/hamburger.svg';
import logo from '../../assets/logo.svg';

export default function udashboard() {

  return (
    <header>
        <div className="leftside">
            <div className="hamburger">
                <img src={hamIcon} alt="Menu" width="20" height="20" className="white-filter" id="hamburger-icon"/>
            </div>
            <p className='dashboard-title'>Agency Screen</p>
        </div>
        <div className="rightside">
            <div className="who-am-i-box">
                <p id="who-am-i">LGU AGENCY EMAIL</p>
                <p id="who-am-i-name">LGU AGENCY NAME</p>
            </div>
            <div className="divider"></div>
            <button id="btn-sign-out">Sign Out</button>
        </div>
    </header>
  );
}