// LOCATION: src/layouts/RegistrationLayout.test.jsx   (NEW FILE)
// Registration Team shell: Admin can return to the Admin dashboard, team members cannot see that link, logout is always reachable (desktop top
// bar + sidebar / mobile drawer), and the navigation never offers a financial or Admin page to a team member. No network: see src/test/apiStub.js.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegistrationLayout from './RegistrationLayout';
import useAuthStore from '../store/authStore';
import { installBrowserStubs, stubApi } from '../test/apiStub';

const ADMIN  = { id: 11, name: 'Ada Admin',   role: 'admin',               registration_stage: 4 };
const MEMBER = { id: 12, name: 'Rhea Member', role: 'registration_member', registration_stage: 4 };
const LEAD   = { id: 13, name: 'Leo Lead',    role: 'registration_lead',   registration_stage: 4 };

const REAL_LOGOUT = useAuthStore.getState().logout;
let net;
let logout;

function renderLayout(user, path = '/registration/dashboard') {
  logout = vi.fn();
  useAuthStore.setState({ user, isAuthenticated: true, hydrated: true, logout });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/registration" element={<RegistrationLayout />}>
          <Route path="dashboard"    element={<div>Registration dashboard body</div>} />
          <Route path="applications" element={<div>Applications body</div>} />
        </Route>
        <Route path="/admin/dashboard" element={<div>ADMIN DASHBOARD PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => { installBrowserStubs(); net = stubApi(); });
afterEach(() => { net.restore(); useAuthStore.setState({ user: null, isAuthenticated: false, logout: REAL_LOGOUT }); });

describe('RegistrationLayout — Admin returning to the main Admin dashboard', () => {
  it('shows an Admin a "Back to Admin Dashboard" link in the sidebar AND the top bar, both pointing at /admin/dashboard', () => {
    renderLayout(ADMIN);
    const links = screen.getAllByRole('link', { name: 'Back to Admin Dashboard' });
    expect(links).toHaveLength(2);
    links.forEach((a) => expect(a).toHaveAttribute('href', '/admin/dashboard'));
    expect(screen.getByText('Viewing as Administrator')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('navigates to the Admin dashboard when the top-bar link is used (the one visible on a phone with the drawer closed)', async () => {
    renderLayout(ADMIN);
    const topbar = screen.getByRole('banner');
    await userEvent.click(within(topbar).getByRole('link', { name: 'Back to Admin Dashboard' }));
    expect(screen.getByText('ADMIN DASHBOARD PAGE')).toBeInTheDocument();
  });

  it('navigates to the Admin dashboard when the sidebar link is used', async () => {
    renderLayout(ADMIN);
    const nav = screen.getByRole('navigation', { name: 'Registration Team navigation' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Back to Admin Dashboard' }));
    expect(screen.getByText('ADMIN DASHBOARD PAGE')).toBeInTheDocument();
  });

  it.each([['member', MEMBER], ['lead', LEAD]])('never shows the Admin link to a Registration %s', (_label, user) => {
    const { container } = renderLayout(user);
    expect(screen.queryByRole('link', { name: /Back to Admin Dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Viewing as Administrator')).not.toBeInTheDocument();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs.filter((h) => /^\/(admin|financial|marvflow|investor)/.test(h))).toEqual([]);
  });
});

describe('RegistrationLayout — logout', () => {
  it.each([['member', MEMBER], ['lead', LEAD], ['admin', ADMIN]])('offers two logout controls (top bar + sidebar) to a %s, and each one logs out', async (_label, user) => {
    renderLayout(user);
    const buttons = screen.getAllByRole('button', { name: /log ?out/i });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);
    expect(logout).toHaveBeenCalledTimes(2);
  });
});

describe('RegistrationLayout — navigation contents', () => {
  it('offers a Registration Team member only onboarding pages', () => {
    const { container } = renderLayout(MEMBER);
    const nav = screen.getByRole('navigation', { name: 'Registration Team navigation' });
    const labels = within(nav).getAllByRole('link').map((a) => a.textContent.trim());
    expect(labels).toEqual(expect.arrayContaining(['Dashboard', 'Applications', 'Activity Log', 'Notifications', 'My account']));
    expect(container.textContent).not.toMatch(/withdrawal|deposit|financial|balance|transaction|investor mailing/i);
  });

  it('keeps the Registration pages reachable (no dead end) from the Admin view', () => {
    renderLayout(ADMIN);
    const nav = screen.getByRole('navigation', { name: 'Registration Team navigation' });
    ['Dashboard', 'Applications', 'Activity Log', 'Notifications', 'My account'].forEach((l) => {
      expect(within(nav).getByRole('link', { name: l })).toBeInTheDocument();
    });
  });
});

describe('RegistrationLayout — mobile drawer', () => {
  it('opens from the menu button and closes from the close button', async () => {
    const { container } = renderLayout(ADMIN);
    const aside = container.querySelector('aside.adm-sidebar');
    expect(aside.className).not.toMatch(/\bopen\b/);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(aside.className).toMatch(/\bopen\b/);
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(aside.className).not.toMatch(/\bopen\b/);
  });

  it('closes after choosing a page, so the drawer never sits over the content', async () => {
    const { container } = renderLayout(MEMBER);
    const aside = container.querySelector('aside.adm-sidebar');
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(aside.className).toMatch(/\bopen\b/);
    await userEvent.click(screen.getByRole('link', { name: 'Applications' }));
    expect(screen.getByText('Applications body')).toBeInTheDocument();
    expect(aside.className).not.toMatch(/\bopen\b/);
  });

  it('keeps the Admin link and logout available in the top bar while the drawer is closed (phone)', () => {
    renderLayout(ADMIN);
    const topbar = screen.getByRole('banner');
    expect(within(topbar).getByRole('link', { name: 'Back to Admin Dashboard' })).toBeInTheDocument();
    expect(within(topbar).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });
});
