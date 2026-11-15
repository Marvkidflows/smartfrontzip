// LOCATION: src/App.registrationAccess.test.jsx   (NEW FILE)
// Renders the REAL <App /> routes (real guards, real layouts) inside a MemoryRouter with a signed-in user of each role and checks where they land.
// This is the frontend half of the permission matrix; the API enforces the same boundary independently (see the backend tests).
// No network: every request is stubbed to fail (src/test/apiStub.js) — pages already handle that with an error state.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import App from './App';
import useAuthStore from './store/authStore';
import { installBrowserStubs, stubApi } from './test/apiStub';

const U = {
  admin:      { id: 21, name: 'Ada Admin',   role: 'admin',               registration_stage: 4 },
  member:     { id: 22, name: 'Rhea Member', role: 'registration_member', registration_stage: 4 },
  lead:       { id: 23, name: 'Leo Lead',    role: 'registration_lead',   registration_stage: 4 },
  financial:  { id: 24, name: 'Fay Fin',     role: 'financial',           registration_stage: 4 },
  investor:   { id: 25, name: 'Ivy Investor', role: 'investor',           registration_stage: 4 },
};

const REAL = { logout: useAuthStore.getState().logout, initializeAuth: useAuthStore.getState().initializeAuth };
let net;
let navigateRef;

function Probe() {
  const loc = useLocation();
  navigateRef = useNavigate();
  return <div data-testid="path">{loc.pathname}</div>;
}

function renderApp(path, user) {
  useAuthStore.setState({
    user, isAuthenticated: !!user, hydrated: true,
    initializeAuth: async () => {},   // the real one validates a stored token against the API; not under test here
  });
  return render(<MemoryRouter initialEntries={[path]}><App /><Probe /></MemoryRouter>);
}

const pathNow = () => screen.getByTestId('path').textContent;
const expectPath = (p) => waitFor(() => expect(pathNow()).toBe(p));

beforeEach(() => { installBrowserStubs(); net = stubApi(); });
afterEach(() => { net.restore(); useAuthStore.setState({ user: null, isAuthenticated: false, ...REAL }); });

describe('Registration Team users — what they can reach', () => {
  it.each([['member', 'member'], ['lead', 'lead']])('a registration %s lands on the Registration Team dashboard', async (_l, key) => {
    renderApp('/registration/dashboard', U[key]);
    await expectPath('/registration/dashboard');
    expect(screen.getByText('Registration Team Dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Back to Admin Dashboard/i })).not.toBeInTheDocument();
  });

  it.each([['member'], ['lead']])('a registration %s opening the bare /registration path is sent to the dashboard', async (key) => {
    renderApp('/registration', U[key]);
    await expectPath('/registration/dashboard');
  });

  it.each([
    '/admin/dashboard', '/admin/users', '/admin/withdrawals', '/admin/deposits', '/admin/mailing/investor', '/admin/approvals',
    '/financial/dashboard', '/financial/withdrawals', '/financial/transactions', '/financial/deposits',
    '/investor/dashboard', '/investor/withdrawals',
  ])('a registration member requesting %s is redirected back to the Registration dashboard', async (path) => {
    renderApp(path, U.member);
    await expectPath('/registration/dashboard');
    expect(screen.getByText('Registration Team Dashboard')).toBeInTheDocument();
  });

  it('a registration lead is kept out of the Admin and Financial areas as well', async () => {
    for (const path of ['/admin/dashboard', '/financial/dashboard']) {
      const { unmount } = renderApp(path, U.lead);
      await expectPath('/registration/dashboard');
      unmount();
    }
  });
});

describe('Everyone else is kept out of the Registration Team dashboard', () => {
  it('sends a signed-out visitor to the login page', async () => {
    renderApp('/registration/dashboard', null);
    await expectPath('/login');
    expect(screen.getByText('Investor Login')).toBeInTheDocument();
  });

  it('sends a Financial user back to the Financial dashboard', async () => {
    renderApp('/registration/dashboard', U.financial);
    await expectPath('/financial/dashboard');
  });

  it('sends an investor back to the investor dashboard', async () => {
    renderApp('/registration/applications', U.investor);
    await expectPath('/investor/dashboard');
  });
});

describe('Admin — moving between the Admin dashboard and the Registration Team dashboard', () => {
  it('can open the Registration Team dashboard from the Admin sidebar', async () => {
    renderApp('/admin/dashboard', U.admin);
    await expectPath('/admin/dashboard');
    await userEvent.click(await screen.findByRole('link', { name: 'Registration Team' }));
    await expectPath('/registration/dashboard');
    expect(screen.getByText('Registration Team Dashboard')).toBeInTheDocument();
  });

  it('sees the "Back to Admin Dashboard" link there (the original bug: there was none)', async () => {
    renderApp('/registration/dashboard', U.admin);
    await expectPath('/registration/dashboard');
    expect(screen.getAllByRole('link', { name: 'Back to Admin Dashboard' })).toHaveLength(2);
  });

  it('returns to the real Admin dashboard (with the full Admin sidebar) using the link', async () => {
    renderApp('/registration/applications', U.admin);
    await expectPath('/registration/applications');
    const topbar = screen.getByRole('banner');
    await userEvent.click(within(topbar).getByRole('link', { name: 'Back to Admin Dashboard' }));
    await expectPath('/admin/dashboard');
    // the Admin layout (and its sidebar) is back, and the Registration shell is gone
    expect(await screen.findByRole('link', { name: 'Investor Ranks' })).toBeInTheDocument();
    expect(screen.queryByText('Registration Team Dashboard')).not.toBeInTheDocument();
  });

  it('browser Back from the Registration dashboard returns to the Admin page the Admin came from', async () => {
    renderApp('/admin/dashboard', U.admin);
    await userEvent.click(await screen.findByRole('link', { name: 'Registration Team' }));
    await expectPath('/registration/dashboard');
    await act(async () => { navigateRef(-1); });
    await expectPath('/admin/dashboard');
    expect(await screen.findByRole('link', { name: 'Investor Ranks' })).toBeInTheDocument();
  });

  it('can reach every Registration page (applications, activity, notifications, profile) without being redirected', async () => {
    for (const path of ['/registration/applications', '/registration/activity', '/registration/notifications', '/registration/profile']) {
      const { unmount } = renderApp(path, U.admin);
      await expectPath(path);
      unmount();
    }
  });
});

describe('Logout from the Registration Team dashboard', () => {
  it('ends the session and lands on the login page; the dashboard is then unreachable', async () => {
    renderApp('/registration/dashboard', U.member);
    await expectPath('/registration/dashboard');
    // the real store logout reloads the page (window.location), which a MemoryRouter cannot follow: swap in the same state change without the reload
    useAuthStore.setState({ logout: async () => { useAuthStore.setState({ user: null, isAuthenticated: false }); } });

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await expectPath('/login');
    expect(screen.getByText('Investor Login')).toBeInTheDocument();
    expect(screen.queryByText('Registration Team Dashboard')).not.toBeInTheDocument();

    await act(async () => { navigateRef('/registration/dashboard'); });
    await expectPath('/login');
  });
});
