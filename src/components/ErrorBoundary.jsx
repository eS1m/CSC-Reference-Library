import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f7fa',
          fontFamily: "'Outfit', sans-serif",
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '40px',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fff3cd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '28px'
            }}>
              ⚠️
            </div>
            <h2 style={{
              margin: '0 0 12px',
              fontSize: '22px',
              fontWeight: 600,
              color: '#1a1a1a'
            }}>
              Something Went Wrong
            </h2>
            <p style={{
              margin: '0 0 24px',
              fontSize: '15px',
              color: '#666',
              lineHeight: 1.5
            }}>
              The application encountered an unexpected error. Please reload the page to continue.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#1a5fb4',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#154a8c'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1a5fb4'}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
