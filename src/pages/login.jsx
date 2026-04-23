import { useState } from 'react';
import '../css/login.css';
import logo from '../assets/logo.svg';
import googleIcon from '../assets/google-icon.svg';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config.js';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore'

// This comment will be pushed into the feature/login branch

export default function Login() {
    const nav = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleUserRoleAndRedirect = async (user) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let role = "u"

        if (!userSnap.exists()) {
            // If user document doesn't exist, create it with default role "u"
            await setDoc(userRef, {
                email: user.email,
                role: role,
                createdAt: new Date(),
            });
        } else {
            role = userSnap.data().role;
        }

        if (role === "xu") {
            nav('/xu-dash');
        } else {
            nav('/dashboard');
        }
    };
   
    const signIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await handleUserRoleAndRedirect(result.user);
        } catch (error) {
            console.log(error);
            alert("Google Sign-In failed.");
        }
    };

    const handleLoginEP = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await handleUserRoleAndRedirect(result.user);
        } catch (err) {
            setError("Invalid email or password");
            console.error(err);
        }
    };
    
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

                        <div className="register">
                            <span>No Account? </span>
                            <a href="/register">Register here</a>
                        </div>
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

