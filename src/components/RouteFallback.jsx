// LOCATION: src/components/RouteFallback.jsx   (NEW FILE — performance remediation)
// Loading fallbacks shown while a lazily-loaded page / layout chunk is downloading, so visitors never see a blank screen.
// Deliberately dependency-free (inline styles, no icons, no CSS import) so it adds almost nothing to the initial bundle.
const SPIN = '@keyframes ssi-route-spin { to { transform: rotate(360deg); } }';

function Spinner({ size = 36, dark = false }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: size, height: size,
        border: `3px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'}`,
        borderTop: '3px solid #f59e0b',
        borderRadius: '50%',
        animation: 'ssi-route-spin 0.8s linear infinite',
      }}
    />
  );
}

// Inline fallback: sits inside an already-rendered layout (sidebar / header stay on screen) while the page body downloads.
export function RouteFallback() {
  return (
    <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <style>{SPIN}</style>
      <Spinner />
    </div>
  );
}

// Full-screen fallback: used while a whole layout (Admin / Investor / Registration ... shell) or an auth page downloads.
export function ScreenFallback() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', zIndex: 9999 }}>
      <style>{SPIN}</style>
      <Spinner size={40} dark />
    </div>
  );
}

export default RouteFallback;
