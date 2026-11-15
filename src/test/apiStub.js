// LOCATION: src/test/apiStub.js   (NEW FILE — test helper only; not imported by application code)
//
// Every service in this app shares ONE axios instance (the default export of src/services/api.js). Replacing that instance's transport
// (its `adapter`) means a test controls ALL network traffic, and no request ever leaves the test process.
//   * stubApi()            → every request fails like a dropped connection (pages already handle this with an error state/toast).
//   * stubApi(handler)     → handler(config) returns the response body; throw to simulate a failure.
// The returned object records every request in `calls` and must be `restore()`d (afterEach).
import api from '../services/api';

export function installBrowserStubs() {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    });
  }
  window.scrollTo = () => {};
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = function scrollIntoView() {};
}

export function stubApi(handler) {
  const original = api.defaults.adapter;
  const calls = [];
  api.defaults.adapter = async (config) => {
    calls.push({ method: String(config.method || 'get').toLowerCase(), url: config.url, data: config.data });
    if (!handler) {
      const err = new Error('Network Error (stubbed in test)');
      err.isAxiosError = true;
      err.config = config;
      throw err;
    }
    const data = await handler(config);
    return { data, status: 200, statusText: 'OK', headers: {}, config, request: {} };
  };
  return { calls, restore() { api.defaults.adapter = original; } };
}
