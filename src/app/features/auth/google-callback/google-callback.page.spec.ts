import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { GoogleCallbackPage } from './google-callback.page';

const API = 'http://api.test';
const GENERIC_MESSAGE = 'Não foi possível concluir o login. Tente de novo.';

describe('GoogleCallbackPage', () => {
  let backend: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  function render(queryParams: Record<string, string>): HTMLElement {
    TestBed.configureTestingModule({
      imports: [GoogleCallbackPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(GoogleCallbackPage);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => backend.verify());

  const alertText = (page: HTMLElement) => page.querySelector('[role="alert"]')?.textContent ?? '';
  const expectParamsClearedFromUrl = () =>
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: {}, replaceUrl: true }),
    );

  it('goes back to /login, replacing the URL and without a message, on access_denied', () => {
    const page = render({ error: 'access_denied' });

    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/login', { replaceUrl: true });
    expect(page.querySelector('[role="alert"]')).toBeNull();
    backend.expectNone(`${API}/auth/google/exchange`);
  });

  it('explains that the Google account email is not verified on email_not_verified', () => {
    const page = render({ error: 'email_not_verified' });

    expect(alertText(page)).toContain('email da sua conta Google não está verificado');
    expect(alertText(page)).not.toContain(GENERIC_MESSAGE);
    expectParamsClearedFromUrl();
    backend.expectNone(`${API}/auth/google/exchange`);
  });

  it.each(['state_mismatch', 'oauth_failed', 'something_new'])(
    'shows the generic message on %s',
    (code) => {
      const page = render({ error: code });

      expect(alertText(page)).toContain(GENERIC_MESSAGE);
      expectParamsClearedFromUrl();
      expect(navigateByUrl).not.toHaveBeenCalled();
      backend.expectNone(`${API}/auth/google/exchange`);
    },
  );

  it('reads error before code: never exchanges a code that came with an error', () => {
    const page = render({ error: 'oauth_failed', code: 'c'.repeat(43) });

    expect(alertText(page)).toContain(GENERIC_MESSAGE);
    backend.expectNone(`${API}/auth/google/exchange`);
  });

  it('still exchanges the code when there is no error', () => {
    const code = 'c'.repeat(43);
    render({ code });

    const exchange = backend.expectOne(`${API}/auth/google/exchange`);
    expect(exchange.request.body).toEqual({ code });
    exchange.flush({
      accessToken: 'fresh',
      user: {
        id: 'u1',
        email: 'ana@example.com',
        name: 'Ana',
        avatarUrl: null,
        emailVerified: true,
        hasPassword: false,
        createdAt: '2026-10-01T12:00:00.000Z',
      },
    });

    expect(navigateByUrl).toHaveBeenCalledWith('/app', { replaceUrl: true });
  });
});
