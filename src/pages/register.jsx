import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Using Link for navigation
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js'; 
import '../css/auth.css';
import logo from '../assets/logo.svg';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'u',
                createdAt: new Date()
            });

            navigate('/dashboard-u');
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card auth-card-register">
                <div className="auth-container">
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
                        <button type="submit" className="auth-button auth-button-register">
                            Create Account
                        </button>
                        <div className="account-exist">
                            <p>Already have one? <Link to="/">Sign in</Link></p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}