import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Using Link for navigation
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js'; 
import '../css/register.css';
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
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Create the user document in Firestore with default role 'u'
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'u', // Assigning default user role
                createdAt: new Date()
            });

            // 3. Send them to the user dashboard
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="register-page"> {/* Changed 'class' to 'className' */}
            <div className="register-card">
                <div className="register-container">
                    <div className="register-header">
                        <div className="register-logo">
                            {/* Use the imported 'logo' variable and close the tag with /> */}
                            <img src={logo} alt="logo" width="75" height="80" />
                        </div>
                        <div className="register-title">
                            <h1>Sign up</h1>
                            <p>Register a new account</p>
                        </div>
                    </div>

                    <div className="register-divider">
                        <span>email and password</span>
                    </div>

                    {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                    <form className="register-form" onSubmit={handleRegister}>
                        <div className="input-group">
                            <label className="form-label" htmlFor="email">Email</label>
                            <input 
                                className="form-input" 
                                type="email" 
                                id="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email" 
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input 
                                className="form-input" 
                                type="password" 
                                id="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password" 
                                required 
                            />
                        </div>
                        <button type="submit" className="register-button">
                            Create Account
                        </button>
                        <div className="account-exist">
                            <p>Already have one?</p> 
                            {/* Using Link is better for SPA performance than <a href> */}
                            <Link to="/">Sign in</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}