import { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';
import { ThemeProvider } from './contexts/ThemeContext';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'system-ui' }}>
          <div style={{ textAlign: 'center', padding: 40, maxWidth: 500 }}>
            <div style={{ width: 60, height: 60, background: 'rgba(239,68,68,0.1)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '12px 32px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
