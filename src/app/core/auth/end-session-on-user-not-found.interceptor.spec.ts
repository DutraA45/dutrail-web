import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../http/api-base-url';
import { apiRequestHeadersInterceptor } from '../http/api-request-headers.interceptor';
import { AccessTokenStore } from './access-token.store';
import { endSessionOnUserNotFoundInterceptor } from './end-session-on-user-not-found.interceptor';
import { refreshOnUnauthorizedInterceptor } from './refresh-on-unauthorized.interceptor';

const API = 'http://api.test';

describe('endSessionOnUserNotFoundInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tokens: AccessTokenStore;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        // Mesma ordem do `app.config.ts`.
        provideHttpClient(
          withInterceptors([
            endSessionOnUserNotFoundInterceptor,
            refreshOnUnauthorizedInterceptor,
            apiRequestHeadersInterceptor,
          ]),
        ),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(AccessTokenStore);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    tokens.set('access-1');
  });

  afterEach(() => backend.verify());

  const userNotFound = { status: 404, statusText: 'Not Found' };
  const userNotFoundBody = {
    statusCode: 404,
    error: 'Not Found',
    message: 'User not found',
    path: '/me',
    timestamp: '',
  };

  it('ends the session and goes to /login on a 404 from GET /me, without a refresh', () => {
    let status: number | undefined;

    http.get(`${API}/me`).subscribe({ error: (e) => (status = e.status) });
    backend.expectOne(`${API}/me`).flush(userNotFoundBody, userNotFound);

    backend.expectNone(`${API}/auth/refresh`);
    expect(status).toBe(404);
    expect(tokens.token()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/login');
  });

  it('compares the path without the query string', () => {
    http.get(`${API}/me?fields=name`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/me?fields=name`).flush(userNotFoundBody, userNotFound);

    expect(tokens.token()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('ends the session and goes to /login on a 404 from POST /activities/import', () => {
    let status: number | undefined;

    http.post(`${API}/activities/import`, new FormData()).subscribe({
      error: (e) => (status = e.status),
    });
    backend
      .expectOne(`${API}/activities/import`)
      .flush({ ...userNotFoundBody, path: '/activities/import' }, userNotFound);

    expect(status).toBe(404);
    expect(tokens.token()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('also sees the 404 of a request repeated after a refresh', () => {
    tokens.set('expired');

    http.get(`${API}/me`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/auth/refresh`).flush({ accessToken: 'fresh' });
    backend.expectOne(`${API}/me`).flush(userNotFoundBody, userNotFound);

    expect(tokens.token()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it.each([
    ['GET', `${API}/activities/0b6f6c1e-3a52-4c3e-9d55-1f0c2a7b9e10`],
    ['GET', `${API}/activities/not-a-uuid`],
    ['GET', `${API}/activities/import`],
    ['GET', `${API}/me/settings`],
    ['POST', `${API}/me`],
    ['GET', 'https://third-party.test/me'],
  ])('keeps the session on a 404 from %s %s', (method, url) => {
    let status: number | undefined;

    http.request(method, url).subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne({ method, url })
      .flush({ ...userNotFoundBody, message: 'Activity not found' }, userNotFound);

    expect(status).toBe(404);
    expect(tokens.token()).toBe('access-1');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the session on other errors from GET /me', () => {
    http.get(`${API}/me`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/me`).flush(null, { status: 503, statusText: 'Unavailable' });

    expect(tokens.token()).toBe('access-1');
    expect(navigate).not.toHaveBeenCalled();
  });
});
