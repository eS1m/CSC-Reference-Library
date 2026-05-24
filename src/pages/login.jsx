import { useState } from 'react';
import '../css/auth.css';
import logo from '../assets/logo.svg';
import googleIcon from '../assets/google-icon.svg';
import { signInWithPopup, signInWithEmailAndPassword, GoogleAuthProvider, signOut, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config.js';
import { useNavigate, Link } from 'react-router-dom';
import { getUserById, createUser, updateUser } from '../firebase/collections/users';
import { createAdminNotifications } from '../firebase/notifications';
import { logActivity } from '../firebase/activityLog';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';
import { db } from '../firebase/config.js';
import { getDocs, collection } from 'firebase/firestore';

const MAX_AGENCY_USERS = Number(import.meta.env.VITE_MAX_AGENCY_USERS) || 25;


export default function Login() {
    const nav = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
    const [showCapacityModal, setShowCapacityModal] = useState(false);
    const [showUnverifiedModal, setShowUnverifiedModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleUserRoleAndRedirect = async (user) => {
        const existingUser = await getUserById(user.uid);

        let role = "u";
        let approvalStatus;
        let isFirstTimeGoogle = false;

        if (!existingUser) {
            isFirstTimeGoogle = true;
            approvalStatus = 'pending';

            await createUser(user.uid, {
                email: user.email,
                role: role,
                approvalStatus: 'pending',
                emailVerified: true,
                createdAt: new Date(),
            });

            await logActivity({
                userId: user.uid,
                userEmail: user.email,
                userRole: role,
                action: 'REGISTER',
                message: `New user ${user.email} registered via Google`
            });

            await createAdminNotifications({
                type: 'NEW_USER_REGISTERED',
                agencyId: user.uid,
                agencyName: user.email,
                roles: ['admin']
            });
        } else {
            role = existingUser.role;
            approvalStatus = existingUser.approvalStatus || 'approved';

            // Sync emailVerified from Firebase Auth to Firestore if it changed
            if (user.emailVerified && !existingUser.emailVerified) {
                await updateUser(user.uid, { emailVerified: true });
            }
        }

        // For non-approved users, require email verification before proceeding
        if (approvalStatus !== 'approved' && !user.emailVerified) {
            await signOut(auth);
            setShowUnverifiedModal(true);
            return;
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

        // Check concurrent user limit for agency users only
        if (role === 'u') {
            try {
                const sessionsSnap = await getDocs(collection(db, 'activeSessions'));
                const now = Date.now();
                const activeCount = sessionsSnap.docs.filter(d => {
                    const data = d.data();
                    if (data.role !== 'u') return false;
                    const hb = data.lastHeartbeat?.toMillis?.() || 0;
                    return now - hb < 2 * 60 * 1000; // 2 minutes
                }).length;

                if (activeCount >= MAX_AGENCY_USERS) {
                    await signOut(auth);
                    setShowCapacityModal(true);
                    return;
                }
            } catch (err) {
                console.error('Error checking active sessions:', err);
                // Fail open: if we can't check, allow login
            }
        }

        const displayEmail = user.email || user.providerData?.[0]?.email || 'unknown';
        await logActivity({
            userId: user.uid,
            userEmail: displayEmail,
            userRole: role,
            action: 'LOGIN',
            message: `User ${displayEmail} logged in`
        });

        if (role === 'admin') {
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
        if (isLoading) return;
        setError('');
        setIsLoading(true);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await handleUserRoleAndRedirect(result.user);
        } catch (err) {
            console.error('Login error:', err.code, err.message);

            // Map Firebase error codes to user-friendly messages
            const errorMessages = {
                'auth/wrong-password': 'Incorrect password. Please try again.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/user-disabled': 'This account has been disabled. Contact an administrator.',
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
                'auth/invalid-credential': 'Invalid email or password. Please try again.',
                'auth/network-request-failed': 'Network error. Please check your connection.',
            };

            setError(errorMessages[err.code] || 'Invalid email or password');
        } finally {
            setIsLoading(false);
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
                            <label className="auth-label" htmlFor="email">Email</label>
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
                            <div className="password-labels">
                                <label className="auth-label" htmlFor="password">Password</label>
                                <span id="forgot-password"><Link to="/forgot">Forgot Password</Link></span>
                            </div>
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
                        <button type="submit" className="auth-button" id="email-login" disabled={isLoading}>
                            {isLoading ? (
                                <Spinner size="sm" color="dark" />
                            ) : (
                                "Login"
                            )}
                        </button>
                        <div className="register">
                            <span>No Account? <a href="/register">Register here</a></span>
                        </div>
                    </form>

                    <div className="auth-divider" id="auth-other">
                        <span>OR</span>
                    </div>

                    <button className="auth-button" id="google-login" onClick={signIn}>
                        <img src={googleIcon} alt="Google Icon" width="20" height="20" />
                    </button>
                </div>
            </div>

            {/* Account Pending Approval Modal */}
            <Modal
              isOpen={showPendingModal}
              onClose={() => setShowPendingModal(false)}
              title="Account Under Review"
              variant="warning"
              actions={
                <button className="modal-btn modal-btn-primary modal-btn-full" onClick={() => setShowPendingModal(false)}>
                  OK
                </button>
              }
            >
              <p style={{ fontWeight: 600 }}>Your account is pending approval</p>
              <p className="modal-subtext">Your account has not yet been approved by an administrator. Please wait for approval or contact your system administrator.</p>
            </Modal>

            {/* First-Time Google Sign-In Modal */}
            <Modal
              isOpen={showFirstTimeModal}
              onClose={() => setShowFirstTimeModal(false)}
              title="Welcome"
              variant="info"
              actions={
                <button className="modal-btn modal-btn-primary modal-btn-full" onClick={() => setShowFirstTimeModal(false)}>
                  OK
                </button>
              }
            >
              <p style={{ fontWeight: 600 }}>Account created successfully!</p>
              <p className="modal-subtext">This is the first time you are logging in with this google account, it will be approved first before you can enter.</p>
            </Modal>

            {/* Max Capacity Modal */}
            <Modal
              isOpen={showCapacityModal}
              onClose={() => setShowCapacityModal(false)}
              title="System at Capacity"
              variant="warning"
              actions={
                <button className="modal-btn modal-btn-primary modal-btn-full" onClick={() => setShowCapacityModal(false)}>
                  OK
                </button>
              }
            >
              <p style={{ fontWeight: 600 }}>Maximum number of users reached</p>
              <p className="modal-subtext">The system currently has the maximum of {MAX_AGENCY_USERS} agency users logged in. Please try logging in at another time.</p>
            </Modal>

            {/* Email Not Verified Modal */}
            <Modal
              isOpen={showUnverifiedModal}
              onClose={() => setShowUnverifiedModal(false)}
              title="Email Not Verified"
              variant="warning"
              actions={
                <button className="modal-btn modal-btn-primary modal-btn-full" onClick={() => setShowUnverifiedModal(false)}>
                  OK
                </button>
              }
            >
              <p style={{ fontWeight: 600 }}>Please verify your email</p>
              <p className="modal-subtext">
                Your email address has not been verified. Please check your inbox
                (and spam folder) for the verification email we sent when you
                registered. Click the link in that email to verify your account,
                then try logging in again.
              </p>
            </Modal>
        </div>
    );
}

