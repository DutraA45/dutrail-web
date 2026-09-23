import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { computed, DOCUMENT, inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { catchError, firstValueFrom, map, Observable, of, switchMap, tap } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { AccessTokenStore } from './access-token.store';
import {
  AuthResponse,
  GoogleCodeExchangeRequest,
  LoginRequest,
  SignupRequest,
  User,
} from './auth.models';
import { TokenRefreshService } from './token-refresh.service';

/**
 * Fonte da verdade da sessão no frontend: quem é o usuário logado e as
 * operações que criam ou encerram a sessão (signup, login, Google, logout,
 * restauração ao recarregar a página).
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly accessTokenStore = inject(AccessTokenStore);
  private readonly tokenRefresh = inject(TokenRefreshService);

  private readonly user = signal<User | null>(null);

  /** Usuário logado, ou `null` se não há sessão. */
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Checagem de sessão já feita (ou em andamento) nesta carga da página. */
  private sessionCheck: Promise<void> | null = null;

  signup(payload: SignupRequest): Observable<User> {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/auth/signup`, payload)
      .pipe(map((response) => this.startSession(response)));
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/auth/login`, credentials)
      .pipe(map((response) => this.startSession(response)));
  }

  /**
   * Primeiro passo do login com Google: sai do app e navega o browser para a API.
   *
   * Tem que ser navegação de página inteira (`window.location.href`), não
   * `HttpClient`. A API responde 302 para `accounts.google.com`, e o Google
   * bloqueia XHR/fetch cross-origin. Por ser navegação, essa rota também não
   * leva `X-Client-Type`: o tipo de cliente é declarado depois, no exchange.
   * (`DOCUMENT.location` é o mesmo objeto que `window.location`, injetado para
   * não depender de globais.)
   */
  startGoogleSignIn(): void {
    this.document.location.href = `${this.apiBaseUrl}/auth/google`;
  }

  /**
   * Último passo do login com Google: troca o código de uso único recebido em
   * `/auth/callback?code=...` pela sessão. É aqui que o cookie do refresh token
   * é definido.
   */
  exchangeGoogleCode(code: string): Observable<User> {
    const payload: GoogleCodeExchangeRequest = { code };
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/auth/google/exchange`, payload)
      .pipe(map((response) => this.startSession(response)));
  }

  /**
   * Revoga a sessão no backend e limpa o estado local.
   *
   * O estado local é limpo mesmo se a request falhar. O access token é
   * stateless e continua válido até expirar, então descartá-lo no cliente é o
   * que efetivamente encerra a sessão neste browser.
   */
  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/auth/logout`, null).pipe(
      // Limpa antes de repassar o resultado, para quem chamou já navegar deslogado.
      tap({
        complete: () => this.clearLocalSession(),
        error: () => this.clearLocalSession(),
      }),
    );
  }

  /**
   * Garante que já se tentou restaurar a sessão nesta carga da página. É o que
   * os guards aguardam antes de decidir se uma rota pode ser aberta.
   *
   * O access token só existe em memória, então após um F5 o app começa
   * "deslogado" mesmo com um refresh token válido no cookie. Consultar
   * `/auth/refresh` antes de renderizar rotas protegidas evita mandar para o
   * login alguém que ainda tem sessão.
   *
   * A checagem roda uma vez só: depois dela, login/logout mantêm o estado
   * atualizado, e repetir o refresh a cada navegação só rotacionaria o token à toa.
   */
  ensureSessionChecked(): Promise<void> {
    if (this.isAuthenticated()) {
      return Promise.resolve();
    }
    this.sessionCheck ??= this.restoreSession();
    return this.sessionCheck;
  }

  /**
   * Encerra a sessão só no cliente. Usado quando a API já disse que a sessão
   * não vale mais (refresh recusado), então não há o que revogar no backend.
   */
  clearLocalSession(): void {
    this.accessTokenStore.clear();
    this.user.set(null);
  }

  private startSession({ accessToken, user }: AuthResponse): User {
    this.accessTokenStore.set(accessToken);
    this.user.set(user);
    return user;
  }

  private restoreSession(): Promise<void> {
    // No servidor (SSR/prerender) não há cookie do usuário: toda página
    // renderizada lá é a versão "deslogada", e o browser refaz a checagem.
    if (!this.isBrowser) {
      return Promise.resolve();
    }

    return firstValueFrom(
      this.tokenRefresh.refresh().pipe(
        // O refresh devolve só o access token; o usuário vem de /me.
        switchMap(() => this.http.get<User>(`${this.apiBaseUrl}/me`)),
        tap((user) => this.user.set(user)),
        map(() => undefined),
        // 401 = sem sessão ou sessão expirada; 404 = o usuário foi apagado.
        // Em qualquer falha o app segue deslogado. Não é um erro para o usuário.
        catchError(() => {
          this.clearLocalSession();
          return of(undefined);
        }),
      ),
    );
  }
}
