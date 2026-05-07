import React from 'react';
import '../../css/lgu/user-layout.css';
import '../../css/lgu/uview.css';

import fileIcon from '../../assets/file.svg';
import { useAgencyData } from '../../hooks/useAgencyData';

export default function Uview() {
  const { submissions, loading, error } = useAgencyData();

  return (
    <main className="view-main-content">
      <div className="view-header">
        <h1>View Your Files</h1>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-container">
          <p>Fetching your documents...</p>
          <div className="loading-bar-background">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="no-files-found">
          <p style={{ color: '#cc0000' }}>Error: {error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && submissions.length === 0 && (
        <div className="no-files-found">
          <p>No files found in the shared directory.</p>
        </div>
      )}

      {/* File Grid */}
      {!loading && !error && submissions.length > 0 && (
        <div className="current-files-found">
          {submissions.map((file) => (
            <div 
              key={file.id} 
              className="file-block" 
              onClick={() => window.open(file.fileUrl, '_blank')}
            >
              <img src={fileIcon} alt="File" width="80" height="80" className="deep-blue-filter"/>
              <p>{file.fileName}</p>
              
              <span className={`status-badge ${(file.status || 'Pending').toLowerCase()}`}>
                {file.status || 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}