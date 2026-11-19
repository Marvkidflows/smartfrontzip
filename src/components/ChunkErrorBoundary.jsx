// LOCATION: src/components/ChunkErrorBoundary.jsx   (NEW FILE — performance remediation)
// If a lazily-loaded chunk still cannot be fetched (offline, blocked, stale deploy) the visitor gets a clear message and a Reload button
// instead of a blank white screen. Only wraps the route tree; it never touches auth state or data.
import { Component } from 'react';

export default class ChunkErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('[ssi] page failed to load', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <h2 style={{ margin: 0 }}>This page could not be loaded</h2>
        <p style={{ margin: 0, maxWidth: 420, color: '#475569' }}>
          Your connection may have dropped while the page was downloading. Please check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: '0.65rem 1.4rem', borderRadius: 10, border: 0, background: '#f59e0b', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}
        >
          Reload page
        </button>
      </div>
    );
  }
}
