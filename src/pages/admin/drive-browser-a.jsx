import { useState } from 'react';
import { useDriveBrowser } from '../../hooks/useDriveBrowser';
import '../../css/admin/admin-dashboard.css';
import '../../css/admin/drive-browser-a.css';
import folderIcon from '../../assets/folder.svg';
import fileIcon from '../../assets/file.svg';
import downloadIcon from '../../assets/download.svg';
import viewIcon from '../../assets/view.svg';
import Modal from '../../components/Modal';
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

export default function DriveBrowserA() {
  const {
    breadcrumbs, loading, error, searchQuery,
    filteredFolders, filteredFiles, recentlyChangedFolders,
    setSearchQuery, fetchContents,
    navigateToFolder, navigateToBreadcrumb,
    handleView, handleDownload, deleteItem
  } = useDriveBrowser();

  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteClick = (item) => {
    setDeleteModal({ open: true, item });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, item: null });
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteLoading(true);
    setDeleteModal(prev => ({ ...prev, error: '', errorCode: '', location: '', webViewLink: '' }));
    try {
      await deleteItem(deleteModal.item);
      closeDeleteModal();
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteModal(prev => ({
        ...prev,
        error: err.message,
        errorCode: err.code || '',
        location: err.location || '',
        webViewLink: err.webViewLink || ''
      }));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="main-content">
      <div className="main-content-header">
        <h1 id="main-content-title">Google Drive Browser</h1>
      </div>

      <div className="drive-browser-container">
        {error && !deleteModal.open && (
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
                  <button
                    className="drive-delete-text-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(folder); }}
                  >
                    Delete
                  </button>
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
                  <button
                    className="drive-delete-text-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(folder); }}
                  >
                    Delete
                  </button>
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
                          <button 
                            className="drive-action-btn delete"
                            onClick={() => handleDeleteClick(file)}
                            title="Delete"
                          >
                            Delete
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

      <Modal
        isOpen={deleteModal.open}
        onClose={closeDeleteModal}
        title={deleteModal.errorCode === 'NOT_OWNER' ? 'Cannot Delete' : 'Confirm Delete'}
        variant={deleteModal.errorCode === 'NOT_OWNER' ? 'warning' : 'danger'}
        actions={
          <>
            <button className="modal-btn modal-btn-secondary" onClick={closeDeleteModal}>
              Cancel
            </button>
            {deleteModal.errorCode === 'NOT_OWNER' && deleteModal.webViewLink ? (
              <button className="modal-btn modal-btn-primary" onClick={() => window.open(deleteModal.webViewLink, '_blank')}>
                Show in Drive
              </button>
            ) : (
              <button
                className="modal-btn modal-btn-danger"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </>
        }
      >
        <p style={{ fontWeight: 600 }}>
          {deleteModal.errorCode === 'NOT_OWNER'
            ? 'This file cannot be deleted'
            : 'Are you sure you want to delete this item?'}
        </p>
        <p className="modal-subtext">{deleteModal.item?.name}</p>
        {deleteModal.location && (
          <div className="drive-notowner-path" style={{ marginTop: '12px' }}>
            <strong>Located in:</strong>{' '}
            <span>{deleteModal.location}</span>
          </div>
        )}
        {deleteModal.error && deleteModal.errorCode !== 'NOT_OWNER' && (
          <p className="modal-subtext" style={{ color: '#c0392b', marginTop: '12px', fontWeight: 500 }}>
            {deleteModal.error}
          </p>
        )}
      </Modal>
    </main>
  );
}
