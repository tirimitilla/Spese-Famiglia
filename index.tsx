import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Simple Error Boundary to catch crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#333', textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{color: '#ef4444'}}>Si è verificato un errore imprevisto.</h1>
          <p>L'applicazione non è riuscita a caricarsi.</p>
          <pre style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px', overflowX: 'auto', textAlign: 'left', maxWidth: '600px', margin: '20px auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
          >
            Ricarica Pagina
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    (
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    )
  );
} else {
  console.error("Impossibile trovare l'elemento root");
}