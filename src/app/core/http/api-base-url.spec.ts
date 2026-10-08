import { apiPathOf, isAuthEndpoint } from './api-base-url';

const API = 'http://api.test';

describe('apiPathOf', () => {
  it('returns the path after the API base, without query string or fragment', () => {
    expect(apiPathOf(`${API}/me`, API)).toBe('/me');
    expect(apiPathOf(`${API}/me?x=1`, API)).toBe('/me');
    expect(apiPathOf(`${API}/activities/import#top`, API)).toBe('/activities/import');
    expect(apiPathOf(`${API}/activities/abc`, API)).toBe('/activities/abc');
  });

  it('returns null for URLs outside the API', () => {
    expect(apiPathOf('https://third-party.test/me', API)).toBeNull();
    expect(apiPathOf(`${API}.evil.test/me`, API)).toBeNull();
  });
});

describe('isAuthEndpoint (401 never triggers a refresh)', () => {
  it.each([
    '/auth/signup',
    '/auth/login',
    '/auth/refresh',
    '/auth/logout',
    '/auth/google/exchange',
  ])('is true for %s', (path) => {
    expect(isAuthEndpoint(`${API}${path}`, API)).toBe(true);
  });

  it('compares the path without the query string', () => {
    expect(isAuthEndpoint(`${API}/auth/refresh?x=1`, API)).toBe(true);
  });

  it.each([
    // Usa Bearer: um 401 nela renova a sessão como em /me.
    '/auth/logout-all',
    '/auth/logout-all?x=1',
    '/auth/google',
    '/auth/loginx',
    '/auth/login/extra',
    '/auth/',
    '/me',
    '/activities/import',
  ])('is false for %s', (path) => {
    expect(isAuthEndpoint(`${API}${path}`, API)).toBe(false);
  });

  it('is false for URLs outside the API', () => {
    expect(isAuthEndpoint('https://third-party.test/auth/login', API)).toBe(false);
  });
});
