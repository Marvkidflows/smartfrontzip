// LOCATION: src/pages/public/LoginPage.registration.test.jsx   (NEW FILE)
// Rendered in ISOLATION (not inside <App />): <App /> would hide a missing branch, because its route guards also bounce a registration user to
// the right place. Here the ONLY thing that can send the user anywhere is LoginPage's own redirect, so the new registration branch is what is tested.
// The store's `login` is replaced by a stub that reports success without touching auth state.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import useAuthStore from '../../store/authStore';
import { installBrowserStubs, stubApi } from '../../test/apiStub';

let net;
let realLogin;

function renderLogin(role) {
  useAuthStore.setState({ login: vi.fn(async () => ({ success: true, user: { id: 1, name: 'Test User', role } })) });
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login"                  element={<LoginPage />} />
        <Route path="/registration/dashboard" element={<div>REGISTRATION DASHBOARD</div>} />
        <Route path="/admin/dashboard"        element={<div>ADMIN DASHBOARD</div>} />
        <Route path="/financial/dashboard"    element={<div>FINANCIAL DASHBOARD</div>} />
        <Route path="/marvflow/dashboard"     element={<div>MARVFLOW DASHBOARD</div>} />
        <Route path="/investor/dashboard"     element={<div>INVESTOR DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function submitCredentials() {
  await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'someone@ssi-dev.test');
  await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'not-a-real-password');
  await userEvent.click(screen.getByRole('button', { name: /sign in|log ?in/i }));
}

beforeEach(() => { installBrowserStubs(); net = stubApi(); realLogin = useAuthStore.getState().login; });
afterEach(() => { net.restore(); useAuthStore.setState({ login: realLogin, user: null, isAuthenticated: false }); });

describe('LoginPage — where each role goes after a successful login', () => {
  it.each([
    ['registration_member', 'REGISTRATION DASHBOARD'],
    ['registration_lead',   'REGISTRATION DASHBOARD'],
    ['admin',               'ADMIN DASHBOARD'],
    ['financial',           'FINANCIAL DASHBOARD'],
    ['marvflow_member',     'MARVFLOW DASHBOARD'],
    ['investor',            'INVESTOR DASHBOARD'],
  ])('%s → %s', async (role, landing) => {
    renderLogin(role);
    await submitCredentials();
    expect(await screen.findByText(landing)).toBeInTheDocument();
  });

  it('does not send a registration user to the investor dashboard first', async () => {
    renderLogin('registration_member');
    await submitCredentials();
    await screen.findByText('REGISTRATION DASHBOARD');
    expect(screen.queryByText('INVESTOR DASHBOARD')).not.toBeInTheDocument();
  });
});
