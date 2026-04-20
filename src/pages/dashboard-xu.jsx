import '../css/dashboard.css';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function XUDashboard() {
    const nav = useNavigate();
    async function logout() {
        await signOut(auth)
        nav('/');
    }
    return (
        <div>
            <h1>Welcome to the XU Dashboard</h1>
            <p>Name: {auth.currentUser.displayName}</p>
            <p>Email: {auth.currentUser.email}</p>
            <button onClick={logout}>Sign Out</button>
            </div>
    );
}