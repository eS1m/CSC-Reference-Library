import { useState } from 'react';
import '../css/auth.css';
import logo from '../assets/logo.svg';
import googleIcon from '../assets/google-icon.svg';
import { signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, googleProvider, db } from '../firebase/config.js';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { logActivity } from '../firebase/activityLog';
import '../css/lock-modal.css';
import closeIcon from '../assets/close.svg';
import warningIcon from '../assets/warning.svg';


export default function Login() {
    const nav = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);

    const handleUserRoleAndRedirect = async (user) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let role = "u";
        let approvalStatus;
        let isFirstTimeGoogle = false;

        if (!userSnap.exists()) {
            isFirstTimeGoogle = true;
            approvalStatus = 'pending';

            await setDoc(userRef, {
                email: user.email,
                role: role,
                approvalStatus: 'pending',
                createdAt: new Date(),
            });

            await logActivity({
                userId: user.uid,
                userEmail: user.email,
                userRole: role,
                action: 'REGISTER',
                message: `New user ${user.email} registered via Google`
            });
        } else {
            role = userSnap.data().role;
            approvalStatus = userSnap.data().approvalStatus || 'approved';
        }

        if (approvalStatus !== 'approved') {
            await signOut(auth);
            if (isFirstTimeGoogle) {
                setShowFirstTimeModal(true);
            } else {
                setShowPendingModal(true);
            }
            return;
        }

        const displayEmail = user.email || user.providerData?.[0]?.email || 'unknown';
        await logActivity({
            userId: user.uid,
            userEmail: displayEmail,
            userRole: role,
            action: 'LOGIN',
            message: `User ${displayEmail} logged in`
        });

        if (role === "xu") {
            nav('/xu-dash');
        } else if (role === 'admin') {
            nav('/dashboard-a');
        } else if (role === 'p') {
            nav('/dashboard-p');
        } else {
            nav('/dashboard-u');
        }
    };
   
    const signIn = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);

            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (token) {
                sessionStorage.setItem('googleAccessToken', token);
            }   

            await handleUserRoleAndRedirect(result.user);
        } catch (error) {
            console.log(error);
            setError("Google sign-in failed. Please try again.");
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
        <div className="auth-page">
            <div className="auth-card auth-card-login">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="auth-logo">
                            <img src={logo} alt="logo" width="75" height="80" />
                        </div>
                        <div className="auth-title">
                            <h1>Login</h1>
                            <p>Sign in to connect</p>
                        </div>
                    </div>

                    <div className="auth-divider">
                        <span>email and password</span>
                    </div>

                    {error && <p id="error-message" style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                    <form className="auth-form" onSubmit={handleLoginEP}>
                        <div className="auth-group">
                            <label className="auth-label" htmlFor="email">Username</label>
                            <input 
                                className="auth-input auth-input-login" 
                                type="email" 
                                id="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                name="email" 
                                placeholder="Enter your email" 
                                required/>
                        </div>
                        <div className="auth-group">
                            <label className="auth-label" htmlFor="password">Password</label>
                            <input 
                                className="auth-input auth-input-login" 
                                type="password" 
                                id="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                name="password" 
                                required 
                                placeholder="Enter your password" />
                        </div>
                        <button type="submit" className="auth-button" id="email-login">
                            Login
                        </button>
                        <div className="register">
                            <span>No Account? <a href="/register">Register here</a></span>
                        </div>
                    </form>

                    <div className="auth-divider" id="auth-other">
                        <span>OR login with</span>
                    </div>

                    <button className="auth-button" id="google-login" onClick={signIn}>
                        <img src={googleIcon} alt="Google Icon" width="20" height="20" />
                    </button>
                </div>
            </div>

            {/* Account Pending Approval Modal */}
            {showPendingModal && (
                <div className="modal-overlay">
                    <div className="modal-content lock-modal">
                        <div className="modal-header">
                            <h2>Account Under Review</h2>
                            <button className="modal-close" onClick={() => setShowPendingModal(false)}>
                                <img src={closeIcon} alt="Close" width="20" height="20"/>
                            </button>
                        </div>
                        <div className="lock-body">
                            <div className="lock-icon-large">
                                <img src={warningIcon} alt="Pending" width="45" height="45" className="grey-filter"/>
                            </div>
                            <p className="lock-message">Your account is pending approval</p>
                            <p className="lock-subtext">Your account has not yet been approved by an administrator. Please wait for approval or contact your system administrator.</p>
                        </div>
                        <div className="modal-actions lock-actions">
                            <button className="understood-btn" onClick={() => setShowPendingModal(false)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* First-Time Google Sign-In Modal */}
            {showFirstTimeModal && (
                <div className="modal-overlay">
                    <div className="modal-content lock-modal">
                        <div className="modal-header">
                            <h2>Welcome</h2>
                            <button className="modal-close" onClick={() => setShowFirstTimeModal(false)}>
                                <img src={closeIcon} alt="Close" width="20" height="20"/>
                            </button>
                        </div>
                        <div className="lock-body">
                            <div className="lock-icon-large">
                                <img src={warningIcon} alt="Welcome" width="45" height="45" className="grey-filter"/>
                            </div>
                            <p className="lock-message">Account created successfully!</p>
                            <p className="lock-subtext">
                                This is the first time you are logging in with this google account,
                                it will be approved first before you can enter.
                            </p>
                        </div>
                        <div className="modal-actions lock-actions">
                            <button className="understood-btn" onClick={() => setShowFirstTimeModal(false)}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

