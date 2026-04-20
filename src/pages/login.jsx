import '../css/login.css';
import logo from '../assets/logo.svg';
import googleIcon from '../assets/google-icon.svg';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const nav = useNavigate();
   
    const signIn = async () => {
        try {
            const result =await signInWithPopup(auth, googleProvider);
            const email = result.user.email;
            if (email.endsWith('@gmail.com')) {
                nav('/dashboard');
            } else if (email.endsWith('@my.xu.edu.ph')) {
                nav('/xu-dash');
            }   else {
                alert('Unauthorized email domain. Please use a valid email to access the dashboard.');
                await auth.signOut();
            }
        } catch (error) {
            console.log(error);
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

                    <form className="login-form">
                        <div className="input-group">
                            <label className="form-label" htmlFor="email">Username</label>
                            <input className="form-input" type="email" id="email" name="email" placeholder="Enter your email" />
                        </div>
                        <div className="input-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input className="form-input" type="password" id="password" name="password" placeholder="Enter your password" />
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
