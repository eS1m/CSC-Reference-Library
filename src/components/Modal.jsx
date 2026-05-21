import '../css/shared/modal.css';
import closeIcon from '../assets/close.svg';
import warningIcon from '../assets/warning.svg';
import lockIcon from '../assets/lock.svg';
import approvedIcon from '../assets/approved.svg';
import rejectedIcon from '../assets/rejected.svg';

const VARIANT_CONFIG = {
  info: {
    icon: lockIcon,
    iconClass: 'modal-icon-info',
  },
  warning: {
    icon: warningIcon,
    iconClass: 'modal-icon-warning',
  },
  danger: {
    icon: rejectedIcon,
    iconClass: 'modal-icon-danger',
  },
  success: {
    icon: approvedIcon,
    iconClass: 'modal-icon-success',
  },
};

export default function Modal({
  isOpen,
  onClose,
  title,
  variant = 'info',
  icon,
  children,
  actions,
  size = 'md',
  hideIcon = false,
  className = '',
  hideCloseButton = false,
  disableOverlayClose = false,
}) {
  if (!isOpen) return null;

  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
  const iconSrc = icon || config.icon;
  const iconClass = config.iconClass;

  return (
    <div className="modal-overlay" onClick={disableOverlayClose ? undefined : onClose}>
      <div
        className={`modal-content modal-${variant} modal-size-${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          {!hideCloseButton && (
            <button className="modal-close" onClick={onClose} title="Close">
              <img src={closeIcon} alt="Close" width="20" height="20" />
            </button>
          )}
        </div>

        <div className={`modal-body ${hideIcon ? 'modal-body-no-icon' : ''}`}>
          {!hideIcon && (
            <div className={`modal-icon ${iconClass}`}>
              <img src={iconSrc} alt={variant} width="28" height="28" />
            </div>
          )}
          <div className="modal-body-content">{children}</div>
        </div>

        {actions && (
          <div className="modal-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
