import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Using Link for navigation
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js'; 
import { logActivity } from '../firebase/activityLog';
import '../css/auth.css';
import '../css/lock-modal.css';
import closeIcon from '../assets/close.svg';
import approvedIcon from '../assets/approved.svg';
import logo from '../assets/logo.svg';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('u');
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: role,
                approvalStatus: 'pending',
                createdAt: new Date()
            });

            await logActivity({
                userId: user.uid,
                userEmail: user.email,
                userRole: role,
                action: 'REGISTER',
                message: `New user ${user.email} registered as ${role}`
            });

            await signOut(auth);
            setShowModal(true);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-register">
                <div className="auth-container auth-container-register">
                    <div className="auth-header">
                        <div className="auth-logo auth-logo-register">
                            <img src={logo} alt="logo" width="75" height="80" />
                        </div>
                        <div className="auth-title">
                            <h1>Sign up</h1>
                            <p>Register a new account</p>
                        </div>
                    </div>

                    <div className="auth-divider">
                        <span>email and password</span>
                    </div>

                    {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                    <form className="auth-form" onSubmit={handleRegister}>
                        <div className="auth-group">
                            <label className="auth-label" htmlFor="email">Email</label>
                            <input 
                                className="auth-input auth-input-register" 
                                type="email" 
                                id="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email" 
                                required 
                            />
                        </div>
                        <div className="auth-group">
                            <label className="auth-label" htmlFor="password">Password</label>
                            <input 
                                className="auth-input auth-input-register" 
                                type="password" 
                                id="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password" 
                                required 
                            />
                        </div>
                        <div className="auth-group">
                            <label className="auth-label">Account Type</label>
                            <div className="role-selector">
                                <div 
                                    className={`role-card ${role === 'u' ? 'selected' : ''}`}
                                    onClick={() => setRole('u')}
                                >
                                    <span className="role-card-title">Agency User</span>
                                    <span className="role-card-desc">Government agency / LGU</span>
                                </div>
                                <div 
                                    className={`role-card ${role === 'p' ? 'selected' : ''}`}
                                    onClick={() => setRole('p')}
                                >
                                    <span className="role-card-title">PRIME Officer</span>
                                    <span className="role-card-desc">CSC reviewer</span>
                                </div>
                                <div 
                                    className={`role-card ${role === 'admin' ? 'selected' : ''}`}
                                    onClick={() => setRole('admin')}
                                >
                                    <span className="role-card-title">Administrator</span>
                                    <span className="role-card-desc">System admin</span>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="auth-button auth-button-register">
                            Create Account
                        </button>
                        <div className="account-exist">
                            <p>Already have one? <Link to="/">Sign in</Link></p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Registration Success Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content lock-modal">
                        <div className="modal-header">
                            <h2>Account Created</h2>
                            <button className="modal-close" onClick={() => { setShowModal(false); navigate('/'); }}>
                                <img src={closeIcon} alt="Close" width="20" height="20"/>
                            </button>
                        </div>
                        <div className="lock-body">
                            <div className="lock-icon-large">
                                <img src={approvedIcon} alt="Success" width="45" height="45" className="grey-filter"/>
                            </div>
                            <p className="lock-message">Account created successfully!</p>
                            <p className="lock-subtext">Your account is pending admin approval. You will be able to log in once an administrator has reviewed and approved your request.</p>
                        </div>
                        <div className="modal-actions lock-actions">
                            <button className="understood-btn" onClick={() => { setShowModal(false); navigate('/'); }}>
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}