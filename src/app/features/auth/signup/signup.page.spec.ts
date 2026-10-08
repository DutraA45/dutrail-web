import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { SignupPage } from './signup.page';

const API = 'http://api.test';

describe('SignupPage', () => {
  let fixture: ComponentFixture<SignupPage>;
  let backend: HttpTestingController;
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SignupPage);
    page = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  /** Deixa as promises da submissão andarem e atualiza a tela. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function submit(emailValue = 'ana@example.com'): Promise<void> {
    const type = (id: string, value: string) => {
      const input = page.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    type('signup-email', emailValue);
    type('signup-password', 'senha-segura-123');
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  function failSignup(status: number, message: string | string[]): void {
    backend
      .expectOne(`${API}/auth/signup`)
      .flush(
        { statusCode: status, error: 'Error', message, path: '/auth/signup', timestamp: '' },
        { status, statusText: 'Error' },
      );
  }

  const formAlert = () => page.querySelector('app-error-alert');
  const emailFieldErrors = () =>
    Array.from(page.querySelectorAll('#signup-email ~ hlm-field-error'), (el) =>
      el.textContent?.trim(),
    ).filter(Boolean);

  it('shows a 400 about the email under the email field, not in the form alert', async () => {
    await submit();
    failSignup(400, ['email must be an email']);
    await settle();

    expect(formAlert()).toBeNull();
    expect(emailFieldErrors()).toEqual(['Informe um email válido.']);
  });

  it('shows a generic message for any other 400', async () => {
    await submit();
    failSignup(400, ['property nickname should not exist']);
    await settle();

    expect(formAlert()?.textContent).toContain(
      'Não foi possível concluir o cadastro. Confira os dados e tente de novo.',
    );
    expect(formAlert()?.textContent).not.toContain('nickname');
    expect(emailFieldErrors()).toEqual([]);
  });

  it('handles a 400 about both email and password in their own places', async () => {
    await submit();
    failSignup(400, [
      'email must be an email',
      'password must be shorter than or equal to 128 characters after Unicode normalization (NFKC)',
    ]);
    await settle();

    expect(emailFieldErrors()).toEqual(['Informe um email válido.']);
    expect(formAlert()?.textContent).toContain('Escolha outra senha');
  });

  it.each(['ana@empresa', 'ana@empresa.c', 'abc'])(
    'blocks %j before sending, with a single message',
    async (emailValue) => {
      await submit(emailValue);

      backend.expectNone(`${API}/auth/signup`);
      expect(emailFieldErrors()).toEqual(['Informe um email válido.']);
    },
  );

  it('replaces the backend text of a 400 with its own message about the password', async () => {
    await submit();
    failSignup(400, ['password has appeared in a known data breach; choose a different one']);
    await settle();

    const alert = formAlert();
    expect(alert?.textContent).toContain(
      'Escolha outra senha: esta é fraca ou já apareceu em vazamentos de dados.',
    );
    expect(alert?.textContent).not.toContain('data breach');
  });

  it('still shows a 409 under the email field, not in the form alert', async () => {
    await submit();
    failSignup(409, 'Email already registered');
    await settle();

    expect(formAlert()).toBeNull();
    expect(page.querySelector('hlm-field-error')?.textContent).toContain(
      'Este email já está em uso. Entre com ele ou use outro.',
    );
  });
});
