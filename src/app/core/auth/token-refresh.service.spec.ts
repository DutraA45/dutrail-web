import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../http/api-base-url';
import { AccessTokenStore } from './access-token.store';
import {
  NETWORK_RETRY_DELAY_MS,
  REFRESH_LOCK_NAME,
  TokenRefreshService,
} from './token-refresh.service';

const API = 'http://api.test';
const REFRESH_URL = `${API}/auth/refresh`;

describe('TokenRefreshService', () => {
  let backend: HttpTestingController;
  let tokens: AccessTokenStore;

  function setup(): TokenRefreshService {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(AccessTokenStore);
    return TestBed.inject(TokenRefreshService);
  }

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  describe('without the Web Locks API', () => {
    it('shares one request between concurrent callers and stores the new token', () => {
      const service = setup();
      const results: string[] = [];

      service.refresh().subscribe((token) => results.push(token));
      service.refresh().subscribe((token) => results.push(token));

      backend.expectOne(REFRESH_URL).flush({ accessToken: 'fresh' });

      expect(results).toEqual(['fresh', 'fresh']);
      expect(tokens.token()).toBe('fresh');
    });

    it('repeats the refresh once, after a short delay, on a network error', async () => {
      vi.useFakeTimers();
      const service = setup();
      let token: string | undefined;

      service.refresh().subscribe((value) => (token = value));
      backend.expectOne(REFRESH_URL).error(new ProgressEvent('error'));

      await vi.advanceTimersByTimeAsync(NETWORK_RETRY_DELAY_MS - 1);
      backend.expectNone(REFRESH_URL);

      await vi.advanceTimersByTimeAsync(1);
      backend.expectOne(REFRESH_URL).flush({ accessToken: 'fresh' });

      expect(token).toBe('fresh');
    });

    it('gives up after the single repetition when the network keeps failing', async () => {
      vi.useFakeTimers();
      const service = setup();
      let status: number | undefined;

      service.refresh().subscribe({ error: (e) => (status = e.status) });
      backend.expectOne(REFRESH_URL).error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(NETWORK_RETRY_DELAY_MS);
      backend.expectOne(REFRESH_URL).error(new ProgressEvent('error'));
      await vi.advanceTimersByTimeAsync(NETWORK_RETRY_DELAY_MS * 10);

      backend.expectNone(REFRESH_URL);
      expect(status).toBe(0);
    });

    it.each([401, 429, 503])('does not repeat the refresh on a %i', async (status) => {
      vi.useFakeTimers();
      const service = setup();
      let received: number | undefined;

      service.refresh().subscribe({ error: (e) => (received = e.status) });
      backend.expectOne(REFRESH_URL).flush(null, { status, statusText: 'Error' });
      await vi.advanceTimersByTimeAsync(NETWORK_RETRY_DELAY_MS * 10);

      backend.expectNone(REFRESH_URL);
      expect(received).toBe(status);
    });

    it('starts a new refresh once the previous one has finished', () => {
      const service = setup();

      service.refresh().subscribe();
      backend.expectOne(REFRESH_URL).flush({ accessToken: 'first' });
      service.refresh().subscribe();
      backend.expectOne(REFRESH_URL).flush({ accessToken: 'second' });

      expect(tokens.token()).toBe('second');
    });
  });

  describe('with the Web Locks API', () => {
    let request: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Lock de mentira que só deixa o callback rodar quando o teste mandar,
      // como se outra aba estivesse com ele.
      request = vi.fn();
      Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'locks');
    });

    it('runs the refresh inside the cross-tab lock and holds it until the response', async () => {
      let grantLock: () => Promise<unknown> = () => Promise.reject(new Error('lock not requested'));
      let lockReleased = false;
      request.mockImplementation(
        (_name: string, callback: () => Promise<unknown>) =>
          new Promise((resolve, reject) => {
            grantLock = () =>
              callback().then((value) => {
                lockReleased = true;
                resolve(value);
              }, reject);
          }),
      );
      const service = setup();
      let token: string | undefined;

      service.refresh().subscribe((value) => (token = value));

      expect(request).toHaveBeenCalledOnce();
      expect(request.mock.calls[0][0]).toBe(REFRESH_LOCK_NAME);
      // Enquanto outra aba tem o lock, nenhuma request sai daqui.
      backend.expectNone(REFRESH_URL);

      const granted = grantLock();
      backend.expectOne(REFRESH_URL).flush({ accessToken: 'fresh' });
      await granted;

      expect(lockReleased).toBe(true);
      expect(token).toBe('fresh');
      expect(tokens.token()).toBe('fresh');
    });

    it('propagates a refresh error through the lock', async () => {
      request.mockImplementation((_name: string, callback: () => Promise<unknown>) => callback());
      const service = setup();
      const failure = new Promise<number>((resolve) =>
        service.refresh().subscribe({ error: (e) => resolve(e.status) }),
      );

      backend.expectOne(REFRESH_URL).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(await failure).toBe(401);
    });
  });
});
