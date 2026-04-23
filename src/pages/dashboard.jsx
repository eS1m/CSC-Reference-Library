import { useState } from 'react';
import '../css/dashboard.css';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const nav = useNavigate();
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    async function logout() {
        await signOut(auth)
        nav('/');
    }

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setUploadStatus('');
    };

    const handleUpload = async () => {
        if (!file) {
            setUploadStatus('Please select a file to upload.');
            return;
        }

        setIsUploading(true);
        setUploadStatus('Uploading...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setUploadStatus('Successful Upload!');
                setFile(null);
            } else {
                const errorData = await response.text();
                setUploadStatus('Error uploading file: ' + errorData);
            }
            
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadStatus('Error uploading file.');
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="dashboard-container">
            <h1>Welcome to the Dashboard</h1>
            
            <div className="user-info">
                <p><strong>Name:</strong> {auth.currentUser?.displayName || 'N/A'}</p>
                <p><strong>Email:</strong> {auth.currentUser?.email}</p>
            </div>

            <hr />

            <div className="upload-section">
                <h3>Upload Excel Report</h3>
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
                <button 
                    onClick={handleUpload} 
                    disabled={isUploading || !file}
                    style={{ marginLeft: '10px' }}
                >
                    {isUploading ? 'Uploading...' : 'Upload to Drive'}
                </button>
                <p className="status-message">{uploadStatus}</p>
            </div>

            <hr />

            <button onClick={logout} className="logout-btn">Sign Out</button>
        </div>
    );
}