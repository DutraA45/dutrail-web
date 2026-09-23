import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { finalize, map, Observable, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { AccessTokenStore } from './access-token.store';
import { RefreshResponse } from './auth.models';

/**
 * Renova o access token com `POST /auth/refresh`, garantindo **um único
 * refresh em voo** por vez.
 *
 * Por que isso importa: o refresh token é de uso único. Cada chamada o invalida
 * e o cookie é sobrescrito com um novo. Se duas requests recebessem 401 ao
 * mesmo tempo e cada uma disparasse seu próprio refresh, a segunda apresentaria
 * um token já rotacionado. A API interpreta isso como roubo de token e **revoga
 * todas as sessões do usuário**. Por isso quem chegar enquanto um refresh está
 * em andamento recebe o mesmo Observable e espera o mesmo resultado.
 *
 * É usado tanto pelo interceptor (401 em uma request comum) quanto pela
 * restauração de sessão ao abrir o app, então os dois também nunca disparam
 * refreshes concorrentes.
 */
@Service()
export class TokenRefreshService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly accessTokenStore = inject(AccessTokenStore);

  private inFlight: Observable<string> | null = null;

  /** Emite o novo access token (e já o guarda no `AccessTokenStore`). */
  refresh(): Observable<string> {
    this.inFlight ??= this.http
      // Corpo vazio de propósito. No fluxo web o refresh token vai sozinho no
      // cookie httpOnly. Mandá-lo também no corpo é "token no canal errado"
      // e a API responde 400.
      .post<RefreshResponse>(`${this.apiBaseUrl}/auth/refresh`, null)
      .pipe(
        map(({ accessToken }) => accessToken),
        tap((accessToken) => this.accessTokenStore.set(accessToken)),
        // Liberado ao terminar (com sucesso ou erro), para que um 401 futuro
        // dispare um refresh novo em vez de reaproveitar este.
        finalize(() => (this.inFlight = null)),
        shareReplay(1),
      );

    return this.inFlight;
  }
}
