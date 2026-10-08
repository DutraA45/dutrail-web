import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { AccessTokenStore } from '../../core/auth/access-token.store';
import { User } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/http/api-base-url';
import { apiRequestHeadersInterceptor } from '../../core/http/api-request-headers.interceptor';
import { NavUser } from './nav-user';

const API = 'http://api.test';
const USER: User = {
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana Souza',
  avatarUrl: null,
  emailVerified: true,
  hasPassword: true,
  createdAt: '2026-10-01T12:00:00.000Z',
};

@Component({
  imports: [NavUser],
  template: `<ul appNavUser></ul>`,
})
class Host {}

describe('NavUser: sair de todos os dispositivos', () => {
  let fixture: ComponentFixture<Host>;
  let backend: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let confirm: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiRequestHeadersInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    confirm = vi.spyOn(window, 'confirm');

    auth.login({ email: USER.email, password: 'senha-segura' }).subscribe();
    backend.expectOne(`${API}/auth/login`).flush({ accessToken: 'access-1', user: USER });

    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    backend.verify();
  });

  /** Abre o menu da conta e escolhe "Sair de todos os dispositivos". */
  async function chooseLogoutAll(): Promise<void> {
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('button[hlmSidebarMenuButton]')!.click();
    await fixture.whenStable();

    const item = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(
      (el) => el.textContent?.includes('Sair de todos os dispositivos'),
    );
    expect(item).toBeDefined();
    item!.click();
    await fixture.whenStable();
  }

  it('does nothing when the confirmation is cancelled', async () => {
    confirm.mockReturnValue(false);

    await chooseLogoutAll();

    expect(confirm).toHaveBeenCalledOnce();
    backend.expectNone(`${API}/auth/logout-all`);
    expect(auth.currentUser()).toEqual(USER);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('calls POST /auth/logout-all with bearer and X-Client-Type, then goes to /login', async () => {
    confirm.mockReturnValue(true);
    const toastError = vi.spyOn(toast, 'error');

    await chooseLogoutAll();
    const req = backend.expectOne(`${API}/auth/logout-all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    expect(req.request.headers.get('X-Client-Type')).toBe('web');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.currentUser()).toBeNull();
    expect(TestBed.inject(AccessTokenStore).token()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/login');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('clears the local session, warns with a toast and goes to /login when the call fails', async () => {
    confirm.mockReturnValue(true);
    const toastError = vi.spyOn(toast, 'error');

    await chooseLogoutAll();
    backend
      .expectOne(`${API}/auth/logout-all`)
      .flush(null, { status: 503, statusText: 'Unavailable' });

    expect(auth.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/login');
    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError.mock.calls[0][0]).toContain('outras sessões');
  });
});
