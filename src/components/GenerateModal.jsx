import Modal from './Modal';
import Spinner from './Spinner';

export default function GenerateModal({
  isOpen,
  onClose,
  title,
  blobUrl,
  onDownload,
  onUpload,
  isUploading = false,
  uploadError = '',
  downloadDisabled = false,
  uploadDisabled = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="info"
      size="3xl"
      hideIcon
    >
      <div className="preview-modal-layout">
        <div className="preview-modal-iframe-wrap">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              title="Document Preview"
              className="preview-iframe"
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#888',
              }}
            >
              No preview available
            </div>
          )}
        </div>
        <div className="preview-modal-footer">
          <p className="preview-disclaimer">
            Note: This preview does not accurately show the actual document. This
            is to view if your data is correct. Please download the file for the
            actual result.
          </p>
          {uploadError && (
            <span className="footer-status error">{uploadError}</span>
          )}
          <div className="preview-modal-actions">
            <button className="modal-btn modal-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button
              className="modal-btn modal-btn-primary"
              onClick={onDownload}
              disabled={downloadDisabled}
            >
              Download as Word
            </button>
            <button
              className="modal-btn modal-btn-primary"
              onClick={onUpload}
              disabled={uploadDisabled || isUploading}
            >
              {isUploading ? (
                <Spinner size="xs" color="white" />
              ) : (
                'Upload to Google Drive'
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
