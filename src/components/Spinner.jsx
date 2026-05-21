import '../css/shared/spinner.css';

export default function Spinner({ size = 'md', color = 'white', className = '' }) {
  return <div className={`spinner spinner-${size} spinner-${color} ${className}`} />;
}
