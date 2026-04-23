import { useState } from 'react';
import '../css/login.css';
import logo from '../assets/logo.svg';
import googleIcon from '../assets/google-icon.svg';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config.js';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore'


export default function Register() {
    
    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-container">
                    <div className="login-header">
                        <div className="login-logo">
                            <img src={logo} alt="logo" width="75" height="80" />
                        </div>
                        <div className="login-title">
                            <h1>Login</h1>
                            <p>Sign in to connect</p>
                        </div>
                    </div>

                    <div className="login-divider">
                        <span>email and password</span>
                    </div>

                    {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                    <form className="login-form" onSubmit={handleLoginEP}>
                        <div className="input-group">
                            <label className="form-label" htmlFor="email">Username</label>
                            <input 
                                className="form-input" 
                                type="email" 
                                id="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                name="email" 
                                placeholder="Enter your email" 
                                required/>
                        </div>
                        <div className="input-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input 
                                className="form-input" 
                                type="password" 
                                id="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                name="password" 
                                required 
                                placeholder="Enter your password" />
                        </div>
                        <button type="submit" className="login-button" id="email-login">
                            Login
                        </button>
                    </form>

                    <div className="login-divider" id="login-other">
                        <span>OR login with</span>
                    </div>

                    <button className="login-button" id="google-login" onClick={signIn}>
                        <img src={googleIcon} alt="Google Icon" width="20" height="20" />
                    </button>
                </div>
            </div>
        </div>
    );
    }

