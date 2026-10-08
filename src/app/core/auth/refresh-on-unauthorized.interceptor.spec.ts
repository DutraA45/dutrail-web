import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../http/api-base-url';
import { apiRequestHeadersInterceptor } from '../http/api-request-headers.interceptor';
import { AccessTokenStore } from './access-token.store';
import { refreshOnUnauthorizedInterceptor } from './refresh-on-unauthorized.interceptor';
import { NETWORK_RETRY_DELAY_MS } from './token-refresh.service';

const API = 'http://api.test';

describe('refreshOnUnauthorizedInterceptor + apiRequestHeadersInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tokens: AccessTokenStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([refreshOnUnauthorizedInterceptor, apiRequestHeadersInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(AccessTokenStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  it('sends X-Client-Type, credentials and the bearer token to the API only', () => {
    tokens.set('access-1');

    http.get(`${API}/me`).subscribe();
    http.get('https://third-party.test/data').subscribe();

    const apiReq = backend.expectOne(`${API}/me`).request;
    expect(apiReq.headers.get('X-Client-Type')).toBe('web');
    expect(apiReq.headers.get('Authorization')).toBe('Bearer access-1');
    expect(apiReq.withCredentials).toBe(true);

    const externalReq = backend.expectOne('https://third-party.test/data').request;
    expect(externalReq.headers.has('Authorization')).toBe(false);
    expect(externalReq.headers.has('X-Client-Type')).toBe(false);
    expect(externalReq.withCredentials).toBe(false);
  });

  it('runs a single refresh for concurrent 401s and retries each request with the new token', () => {
    tokens.set('expired');
    const results: unknown[] = [];

    http.get(`${API}/me`).subscribe((body) => results.push(body));
    http.get(`${API}/trails`).subscribe((body) => results.push(body));

    backend.expectOne(`${API}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/trails`).flush(null, { status: 401, statusText: 'Unauthorized' });

    const refresh = backend.expectOne(`${API}/auth/refresh`);
    expect(refresh.request.body).toBeNull();
    refresh.flush({ accessToken: 'fresh' });

    const retriedMe = backend.expectOne(`${API}/me`);
    const retriedTrails = backend.expectOne(`${API}/trails`);
    expect(retriedMe.request.headers.get('Authorization')).toBe('Bearer fresh');
    expect(retriedTrails.request.headers.get('Authorization')).toBe('Bearer fresh');
    retriedMe.flush({ ok: 'me' });
    retriedTrails.flush({ ok: 'trails' });

    expect(results).toEqual([{ ok: 'me' }, { ok: 'trails' }]);
  });

  it('does not try to refresh on a 401 from an /auth route', () => {
    let status: number | undefined;

    http.post(`${API}/auth/login`, {}).subscribe({ error: (e) => (status = e.status) });
    backend.expectOne(`${API}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

    backend.expectNone(`${API}/auth/refresh`);
    expect(status).toBe(401);
  });

  it('does not refresh on a 401 from /auth/refresh with a query string', () => {
    let status: number | undefined;

    http.post(`${API}/auth/refresh?x=1`, null).subscribe({ error: (e) => (status = e.status) });
    backend
      .expectOne(`${API}/auth/refresh?x=1`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    backend.expectNone(`${API}/auth/refresh`);
    expect(status).toBe(401);
  });

  it('refreshes and retries a 401 from /auth/logout-all, which uses the bearer token', () => {
    tokens.set('expired');
    let done = false;

    http.post(`${API}/auth/logout-all`, null).subscribe({ complete: () => (done = true) });
    backend
      .expectOne(`${API}/auth/logout-all`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/auth/refresh`).flush({ accessToken: 'fresh' });

    const retried = backend.expectOne(`${API}/auth/logout-all`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh');
    expect(retried.request.headers.get('X-Client-Type')).toBe('web');
    retried.flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
  });

  it('ends the local session and goes to /login when the refresh is rejected', () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    tokens.set('expired');
    let status: number | undefined;

    http.get(`${API}/me`).subscribe({ error: (e) => (status = e.status) });
    backend.expectOne(`${API}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${API}/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(tokens.token()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it.each([429, 500, 503])(
    'keeps the session and hands the refresh error (%i) to the caller instead of the 401',
    (refreshStatus) => {
      const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      tokens.set('expired');
      let status: number | undefined;

      http.get(`${API}/me`).subscribe({ error: (e) => (status = e.status) });
      backend.expectOne(`${API}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
      backend
        .expectOne(`${API}/auth/refresh`)
        .flush(null, { status: refreshStatus, statusText: 'Error' });

      expect(status).toBe(refreshStatus);
      expect(tokens.token()).toBe('expired');
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('keeps the session and hands the network error to the caller when the refresh cannot reach the API', async () => {
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    tokens.set('expired');
    let status: number | undefined;

    http.get(`${API}/me`).subscribe({ error: (e) => (status = e.status) });
    backend.expectOne(`${API}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'));
    await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAY_MS + 50));
    backend.expectOne(`${API}/auth/refresh`).error(new ProgressEvent('error'));

    expect(status).toBe(0);
    expect(tokens.token()).toBe('expired');
    expect(navigate).not.toHaveBeenCalled();
  });
});
