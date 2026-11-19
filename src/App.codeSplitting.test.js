// LOCATION: src/App.codeSplitting.test.js   (NEW FILE — performance remediation)
// Regression guard for the bundle size. Before the remediation src/App.jsx imported every dashboard page statically, so the landing page
// downloaded the admin, financial, registration-team and MarvFlow code (plus recharts / react-quill) as one ~700 KB entry bundle.
// This test reads App.jsx as text (no rendering, no network) and fails if a heavy page/layout is imported eagerly again.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.jsx', 'utf8');
const staticImports = [...app.matchAll(/^import\s+(?:[\w{}\s,*]+)\s+from\s+'([^']+)';?/gm)].map((m) => m[1]);
const dynamicImports = [...app.matchAll(/import\('([^']+)'\)/g)].map((m) => m[1]);

// The only app modules allowed in the entry chunk: the landing experience + the tiny loading/guard helpers.
const ALLOWED_EAGER_APP_IMPORTS = [
  './store/authStore',
  './utils/lazyWithRetry',
  './components/RouteFallback',
  './components/ChunkErrorBoundary',
  './layouts/PublicLayout',
  './pages/public/HomePage',
];

describe('App.jsx code splitting', () => {
  it('statically imports only the landing experience and loading helpers', () => {
    const appImports = staticImports.filter((p) => p.startsWith('.'));
    expect(appImports.sort()).toEqual([...ALLOWED_EAGER_APP_IMPORTS].sort());
  });

  it('never statically imports a dashboard layout or page (admin / financial / registration / marvflow / investor)', () => {
    const offenders = staticImports.filter((p) => /\.\/(layouts|pages)\//.test(p) && !ALLOWED_EAGER_APP_IMPORTS.includes(p));
    expect(offenders).toEqual([]);
  });

  it('lazy-loads every role layout', () => {
    for (const layout of ['InvestorLayout', 'AdminLayout', 'FinancialLayout', 'MarvflowLayout', 'RegistrationLayout']) {
      expect(dynamicImports).toContain(`./layouts/${layout}`);
    }
  });

  it('keeps the role guards wrapped AROUND the lazy layouts (the protected chunk is never requested before the guard passes)', () => {
    expect(app).toMatch(/<InvestorRoute><Lazy screen><InvestorLayout \/><\/Lazy><\/InvestorRoute>/);
    expect(app).toMatch(/<AdminRoute><Lazy screen><AdminLayout \/><\/Lazy><\/AdminRoute>/);
    expect(app).toMatch(/<FinancialRoute><Lazy screen><FinancialLayout \/><\/Lazy><\/FinancialRoute>/);
    expect(app).toMatch(/<MarvflowRoute><Lazy screen><MarvflowLayout \/><\/Lazy><\/MarvflowRoute>/);
    expect(app).toMatch(/<RegistrationRoute><Lazy screen><RegistrationLayout \/><\/Lazy><\/RegistrationRoute>/);
  });

  it('lazy-loads login and registration as their own chunks (RegisterPage pulls in the phone-number library)', () => {
    expect(dynamicImports).toContain('./pages/public/LoginPage');
    expect(dynamicImports).toContain('./pages/public/RegisterPage');
  });

  it('keeps a Suspense fallback around every lazy route element (no blank pages while a chunk downloads)', () => {
    const lazyNames = [...app.matchAll(/^const (\w+)\s+= lazyPage\(/gm)].map((m) => m[1]);
    expect(lazyNames.length).toBeGreaterThan(60);
    for (const name of lazyNames) {
      const uses = [...app.matchAll(new RegExp(`<${name}[ />]`, 'g'))].length;
      const wrapped = [...app.matchAll(new RegExp(`<Lazy(?: screen)?><${name}[ />][^\\n]*?</Lazy>`, 'g'))].length;
      expect(wrapped, `${name} is rendered without a Suspense fallback`).toBe(uses);
    }
  });
});
