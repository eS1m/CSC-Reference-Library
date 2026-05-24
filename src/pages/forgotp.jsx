import { useState } from 'react';
import '../css/auth.css';
import logo from '../assets/logo.svg';
import { auth } from '../firebase/config.js';
import { useNavigate, Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import Spinner from '../components/Spinner';
import Modal from '../components/Modal';

export default function Forgotp() {
    const nav = useNavigate();

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [showNotFoundModal, setShowNotFoundModal] = useState(false);
    const [showSentModal, setShowSentModal] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        try {
            // Configure where the user is redirected after resetting
            // their password on Firebase's default handler page.
            const actionCodeSettings = {
                url: `${window.location.origin}/`,
                handleCodeInApp: false,
            };

            await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
            setShowSentModal(true);
        } catch (err) {
            console.error('Password reset error:', err);

            // Firebase throws auth/user-not-found when the email
            // is not registered in the project.
            if (err.code === 'auth/user-not-found') {
                setShowNotFoundModal(true);
            } else if (err.code === 'auth/invalid-email') {
                // We could show a separate "invalid email" modal,
                // but the browser's type="email" validation catches most cases.
                setShowNotFoundModal(true);
            } else {
                // For any other error (network, too-many-requests, etc.),
                // show the not-found modal as a safe fallback.
                setShowNotFoundModal(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-forgot">
                <div className="auth-container">
                    <div className="auth-header">
                        <div className="auth-logo auth-logo-forgot">
                            <img src={logo} alt="logo" width="75" height="80" />
                        </div>
                        <div className="auth-title">
                            <h1>Reset Password</h1>
                        </div>
                    </div>

                    <div className="auth-divider">
                        <span>reset</span>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="auth-group">
                            <label className="auth-label" htmlFor="email">Email</label>
                            <input
                                className="auth-input auth-input-forgot"
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                name="email"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="auth-button auth-button-forgot"
                            id="email-login"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Spinner size="sm" color="dark" />
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>

                    <div className="account-exist" style={{ marginTop: '16px', textAlign: 'center' }}>
                        <p>
                            Remember your password?{' '}
                            <Link to="/">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Email Not Found Modal */}
            <Modal
                isOpen={showNotFoundModal}
                onClose={() => setShowNotFoundModal(false)}
                title="Email Not Found"
                variant="warning"
                actions={
                    <button
                        className="modal-btn modal-btn-primary modal-btn-full"
                        onClick={() => setShowNotFoundModal(false)}
                    >
                        OK
                    </button>
                }
            >
                <p style={{ fontWeight: 600 }}>We could not find your account</p>
                <p className="modal-subtext">
                    Please check your email again or contact your system administrator
                    if you believe this is an error.
                </p>
            </Modal>

            {/* Reset Email Sent Modal */}
            <Modal
                isOpen={showSentModal}
                onClose={() => {
                    setShowSentModal(false);
                    nav('/');
                }}
                title="Reset Email Sent"
                variant="success"
                actions={
                    <button
                        className="modal-btn modal-btn-primary modal-btn-full"
                        onClick={() => {
                            setShowSentModal(false);
                            nav('/');
                        }}
                    >
                        OK
                    </button>
                }
            >
                <p style={{ fontWeight: 600 }}>Check your inbox and spam folder</p>
                <p className="modal-subtext">
                    If an account exists for <strong>{email}</strong>, a password reset
                    link has been sent. <strong>Please also check your Spam or Junk
                    folder</strong> if you do not see the email in your inbox within a
                    few minutes.
                </p>
            </Modal>
        </div>
    );
}
