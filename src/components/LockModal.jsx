import Modal from './Modal';

export default function LockModal({ isOpen, onClose, currentStep, customMessage }) {
  const getLockMessage = () => {
    if (customMessage) {
      return customMessage;
    }
    if (currentStep < 3) {
      return {
        title: 'Upload Locked',
        message: 'Please complete both your Agency and Employee profiles first.',
        subtext: 'You need to finish setting up your agency information and employee data before you can upload files.',
      };
    }
    return {
      title: 'Upload Locked',
      message: 'Self-Assessment already uploaded.',
      subtext: 'You have already submitted your Self-Assessment. Please proceed to the Action Plan page to generate your next document.',
    };
  };

  const { title, message, subtext } = getLockMessage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="info"
      size="md"
      actions={
        <button className="modal-btn modal-btn-primary modal-btn-full" onClick={onClose}>
          Understood
        </button>
      }
    >
      <p style={{ fontWeight: 600 }}>{message}</p>
      <p className="modal-subtext">{subtext}</p>
    </Modal>
  );
}
