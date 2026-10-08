import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../http/api-base-url';
import { AccessTokenStore } from './access-token.store';
import { User } from './auth.models';
import { AuthService, SESSION_CHECK_COOLDOWN_MS } from './auth.service';
import { NETWORK_RETRY_DELAY_MS } from './token-refresh.service';

const API = 'http://api.test';
const USER: User = {
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
  emailVerified: true,
  hasPassword: true,
  createdAt: '2026-10-01T12:00:00.000Z',
};

describe('AuthService.ensureSessionChecked', () => {
  let auth: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  it('restores the session with refresh + /me and does not check again', async () => {
    vi.useFakeTimers();
    const check = auth.ensureSessionChecked();
    backend.expectOne(`${API}/auth/refresh`).flush({ accessToken: 'fresh' });
    backend.expectOne(`${API}/me`).flush(USER);
    await check;
    expect(auth.currentUser()).toEqual(USER);

    await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS * 2);
    const again = auth.ensureSessionChecked();
    backend.expectNone(`${API}/auth/refresh`);
    await again;
  });

  it('keeps the result of a 401 on refresh: no new attempt, however late', async () => {
    vi.useFakeTimers();
    const first = auth.ensureSessionChecked();
    backend
      .expectOne(`${API}/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await first;

    await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS * 2);
    const again = auth.ensureSessionChecked();
    backend.expectNone(`${API}/auth/refresh`);
    await again;
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('keeps the result of a 404 on /me (deleted user), however late', async () => {
    vi.useFakeTimers();
    const first = auth.ensureSessionChecked();
    backend.expectOne(`${API}/auth/refresh`).flush({ accessToken: 'fresh' });
    backend.expectOne(`${API}/me`).flush(null, { status: 404, statusText: 'Not Found' });
    await first;

    await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS * 2);
    const again = auth.ensureSessionChecked();
    backend.expectNone(`${API}/auth/refresh`);
    await again;
    expect(auth.isAuthenticated()).toBe(false);
  });

  describe('after a transient failure', () => {
    beforeEach(() => vi.useFakeTimers());

    /** Checagem que termina sem sessão com o status dado no refresh. */
    async function failRefresh(status: number): Promise<void> {
      const check = auth.ensureSessionChecked();
      backend.expectOne(`${API}/auth/refresh`).flush(null, { status, statusText: 'Error' });
      await check;
    }

    async function restoreSuccessfully(): Promise<void> {
      const check = auth.ensureSessionChecked();
      backend.expectOne(`${API}/auth/refresh`).flush({ accessToken: 'fresh' });
      backend.expectOne(`${API}/me`).flush(USER);
      await check;
    }

    it.each([429, 500, 503])(
      'answers "no session" without a request within 5 s of a %i',
      async (status) => {
        await failRefresh(status);

        await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS - 1);
        const again = auth.ensureSessionChecked();

        backend.expectNone(`${API}/auth/refresh`);
        await again;
        expect(auth.isAuthenticated()).toBe(false);
      },
    );

    it.each([429, 500, 503])('tries again once 5 s have passed since a %i', async (status) => {
      await failRefresh(status);

      await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS);
      await restoreSuccessfully();

      expect(auth.currentUser()).toEqual(USER);
    });

    it('treats a 5xx on /me the same way', async () => {
      const first = auth.ensureSessionChecked();
      backend.expectOne(`${API}/auth/refresh`).flush({ accessToken: 'fresh' });
      backend.expectOne(`${API}/me`).flush(null, { status: 502, statusText: 'Bad Gateway' });
      await first;

      const again = auth.ensureSessionChecked();
      backend.expectNone(`${API}/auth/refresh`);
      await again;

      await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS);
      await restoreSuccessfully();
      expect(auth.currentUser()).toEqual(USER);
    });

    it('treats a network error on refresh (after its single repetition) the same way', async () => {
      const first = auth.ensureSessionChecked();
      backend.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(NETWORK_RETRY_DELAY_MS);
      backend.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'));
      await first;

      const again = auth.ensureSessionChecked();
      backend.expectNone(`${API}/auth/refresh`);
      await again;

      await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS);
      await restoreSuccessfully();
      expect(auth.currentUser()).toEqual(USER);
    });

    it('measures the 5 s from the latest failure', async () => {
      await failRefresh(503);
      await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS);
      await failRefresh(503);

      await vi.advanceTimersByTimeAsync(SESSION_CHECK_COOLDOWN_MS - 1);
      const again = auth.ensureSessionChecked();
      backend.expectNone(`${API}/auth/refresh`);
      await again;
    });
  });
});

describe('AuthService.logoutAll', () => {
  let auth: AuthService;
  let backend: HttpTestingController;
  let tokens: AccessTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    auth = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(AccessTokenStore);

    auth.login({ email: USER.email, password: 'senha-segura' }).subscribe();
    backend.expectOne(`${API}/auth/login`).flush({ accessToken: 'access-1', user: USER });
  });

  afterEach(() => backend.verify());

  it('posts an empty body to /auth/logout-all and clears the local session', () => {
    let done = false;

    auth.logoutAll().subscribe({ complete: () => (done = true) });
    const req = backend.expectOne(`${API}/auth/logout-all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
    expect(auth.currentUser()).toBeNull();
    expect(tokens.token()).toBeNull();
  });

  it('clears the local session even when the request fails', () => {
    let status: number | undefined;

    auth.logoutAll().subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne(`${API}/auth/logout-all`)
      .flush(null, { status: 503, statusText: 'Unavailable' });

    expect(status).toBe(503);
    expect(auth.currentUser()).toBeNull();
    expect(tokens.token()).toBeNull();
  });
});
