import { apiPathOf, isApiUrl, isAuthEndpoint } from './api-base-url';

const API = '/api';

describe('isApiUrl', () => {
  it('is true only for URLs under the relative API base', () => {
    expect(isApiUrl('/api/me', API)).toBe(true);
    expect(isApiUrl('/api', API)).toBe(false);
    expect(isApiUrl('/apix/me', API)).toBe(false);
    expect(isApiUrl('/app/feed', API)).toBe(false);
    expect(isApiUrl('https://third-party.test/api/me', API)).toBe(false);
  });
});

describe('apiPathOf', () => {
  it('returns the path with the /api prefix, without query string or fragment', () => {
    expect(apiPathOf(`${API}/me`, API)).toBe('/api/me');
    expect(apiPathOf(`${API}/me?x=1`, API)).toBe('/api/me');
    expect(apiPathOf(`${API}/activities/import#top`, API)).toBe('/api/activities/import');
    expect(apiPathOf(`${API}/activities/abc`, API)).toBe('/api/activities/abc');
  });

  it('also works with an absolute base', () => {
    const base = 'https://dutrail.test/api';
    expect(apiPathOf(`${base}/auth/login?x=1`, base)).toBe('/api/auth/login');
  });

  it('returns null for URLs outside the API', () => {
    expect(apiPathOf('https://third-party.test/me', API)).toBeNull();
    expect(apiPathOf(`${API}.evil.test/me`, API)).toBeNull();
  });
});

describe('isAuthEndpoint (401 never triggers a refresh)', () => {
  it.each([
    '/api/auth/signup',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/google/exchange',
  ])('is true for %s', (url) => {
    expect(isAuthEndpoint(url, API)).toBe(true);
  });

  it('compares the path without the query string', () => {
    expect(isAuthEndpoint('/api/auth/refresh?x=1', API)).toBe(true);
  });

  it.each([
    // Usa Bearer: um 401 nela renova a sessão como em /api/me.
    '/api/auth/logout-all',
    '/api/auth/logout-all?x=1',
    '/api/auth/google',
    '/api/auth/loginx',
    '/api/auth/login/extra',
    '/api/auth/',
    '/api/me',
    '/api/activities/import',
    // Sem o prefixo não é uma rota da API (a API responde 404 a ela).
    '/auth/login',
  ])('is false for %s', (url) => {
    expect(isAuthEndpoint(url, API)).toBe(false);
  });

  it('is false for URLs outside the API', () => {
    expect(isAuthEndpoint('https://third-party.test/api/auth/login', API)).toBe(false);
  });
});
