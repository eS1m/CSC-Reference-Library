import { useDriveBrowser } from '../../hooks/useDriveBrowser';
import '../../css/admin/admin-dashboard.css';
import '../../css/admin/drive-browser-a.css';
import folderIcon from '../../assets/folder.svg';
import fileIcon from '../../assets/file.svg';
import downloadIcon from '../../assets/download.svg';
import viewIcon from '../../assets/view.svg';
import Spinner from '../../components/Spinner';

function formatBytes(bytes) {
  if (!bytes) return '—';
  const num = parseInt(bytes);
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export default function DriveBrowserCSC() {
  const {
    breadcrumbs, loading, error, searchQuery,
    filteredFolders, filteredFiles, recentlyChangedFolders,
    setSearchQuery, fetchContents,
    navigateToFolder, navigateToBreadcrumb,
    handleView, handleDownload
  } = useDriveBrowser();

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Google Drive Browser</h1>
      </div>

      <div className="drive-browser-container">
        {error && (
          <div className="drive-error-banner">
            {error}
            <button className="drive-retry-btn" onClick={fetchContents}>Retry</button>
          </div>
        )}

        <div className="drive-breadcrumbs">
          <button 
            className={`drive-breadcrumb-item ${breadcrumbs.length === 0 ? 'active' : ''}`}
            onClick={() => navigateToBreadcrumb(-1)}
          >
            Root
          </button>
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.id} className="drive-breadcrumb-wrapper">
              <span className="drive-breadcrumb-separator">/</span>
              <button 
                className={`drive-breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                onClick={() => navigateToBreadcrumb(index)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          className="drive-search-bar"
          placeholder="Search folders and files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {loading && (
          <div className="drive-loading-inline">
            <Spinner size="lg" color="primary" />
            <span>Loading contents...</span>
          </div>
        )}

        {!loading && recentlyChangedFolders.length > 0 && (
          <>
            <h2 className="drive-section-title">Recently Changed</h2>
            <div className="drive-folder-grid drive-recent-grid">
              {recentlyChangedFolders.map(folder => (
                <div
                  key={folder.id}
                  className="drive-folder-card drive-recent-card"
                  onClick={() => navigateToFolder(folder)}
                >
                  <img src={folderIcon} alt="Folder" width="48" height="48" className="deep-blue-filter" />
                  <span className="drive-folder-name">{folder.name}</span>
                  <span className="drive-recent-date">{formatDate(folder.modifiedTime)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filteredFolders.length > 0 && (
          <>
            <h2 className="drive-section-title">Folders</h2>
            <div className="drive-folder-grid">
              {filteredFolders.map(folder => (
                <div
                  key={folder.id}
                  className="drive-folder-card"
                  onClick={() => navigateToFolder(folder)}
                >
                  <img src={folderIcon} alt="Folder" width="48" height="48" className="deep-blue-filter" />
                  <span className="drive-folder-name">{folder.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filteredFiles.length > 0 && (
          <>
            <h2 className="drive-section-title">Files</h2>
            <div className="admin-table-container">
              <table className="admin-submissions-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Modified</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map(file => (
                    <tr key={file.id}>
                      <td className="drive-file-name">
                        <img src={fileIcon} alt="File" width="18" height="18" className="deep-blue-filter" />
                        {file.name}
                      </td>
                      <td>{formatDate(file.modifiedTime)}</td>
                      <td>{formatBytes(file.size)}</td>
                      <td>
                        <div className="drive-file-actions">
                          <button 
                            className="drive-action-btn view"
                            onClick={() => handleView(file)}
                            title="View"
                          >
                            <img src={viewIcon} alt="View" width="16" height="16" />
                          </button>
                          <button 
                            className="drive-action-btn download"
                            onClick={() => handleDownload(file)}
                            title="Download"
                            disabled={!file.webContentLink}
                          >
                            <img src={downloadIcon} alt="Download" width="16" height="16" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && filteredFolders.length === 0 && filteredFiles.length === 0 && (
          <div className="drive-empty-state">
            <p>{searchQuery ? 'No folders or files match your search.' : 'This folder is empty.'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
