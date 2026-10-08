import { apiPathOf } from './api-base-url';

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
