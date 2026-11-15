// LOCATION: src/store/authStore.registration.test.js   (NEW FILE)
// The REAL auth store (not stubbed) against a stubbed transport: a Registration Team login keeps its role and token, and logout calls the API,
// removes the token and clears the session. All responses are fabricated in-test; no real credential or account is involved.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useAuthStore from './authStore';
import { stubApi } from '../test/apiStub';

let net;
let errorSpy;

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, isAuthenticated: false, error: null, loading: false });
});
afterEach(() => {
  window.history.pushState({}, '', '/');
  net?.restore();
  errorSpy?.mockRestore();
  localStorage.clear();
});

describe('authStore — Registration Team login', () => {
  it.each(['registration_member', 'registration_lead'])('keeps the %s role, stores the token and marks the session authenticated', async (role) => {
    net = stubApi(async (config) => {
      if (String(config.url).endsWith('/login')) {
        return { token: 'tok-from-test', user: { id: 5, name: 'Test Reviewer', email: 'reviewer@ssi-dev.test', role, registration_stage: 4 } };
      }
      return {};
    });

    const result = await useAuthStore.getState().login({ email: 'reviewer@ssi-dev.test', password: 'whatever-test-only' });

    expect(result.success).toBe(true);
    expect(result.user.role).toBe(role);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user.role).toBe(role);
    expect(localStorage.getItem('auth_token')).toBe('tok-from-test');
  });

  it('does not authenticate when the server refuses the login', async () => {
    window.history.pushState({}, '', '/login');   // the API client's 401 handler only redirects when NOT already on an auth page
    net = stubApi(async () => { throw Object.assign(new Error('refused'), { response: { status: 401, data: { message: 'Invalid email or password.' } } }); });

    const result = await useAuthStore.getState().login({ email: 'reviewer@ssi-dev.test', password: 'wrong' });

    expect(result.success).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});

describe('authStore — logout', () => {
  it('calls the logout endpoint, removes the token and clears the user', async () => {
    // jsdom cannot perform the full-page navigation that logout() triggers; it reports "not implemented" on console.error. Silence only that.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    net = stubApi(async () => ({ message: 'Logged out successfully.' }));
    localStorage.setItem('auth_token', 'tok-from-test');
    useAuthStore.setState({ user: { id: 5, role: 'registration_member' }, isAuthenticated: true });

    await useAuthStore.getState().logout();

    expect(net.calls.some((c) => c.method === 'post' && String(c.url).endsWith('/logout'))).toBe(true);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('still clears the local session if the server cannot be reached', async () => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    net = stubApi();   // every request fails
    localStorage.setItem('auth_token', 'tok-from-test');
    useAuthStore.setState({ user: { id: 5, role: 'registration_lead' }, isAuthenticated: true });

    await useAuthStore.getState().logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
