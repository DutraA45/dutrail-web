import { HttpClient } from '@angular/common/http';
import { DOCUMENT, inject, Service } from '@angular/core';
import {
  defer,
  finalize,
  firstValueFrom,
  map,
  Observable,
  retry,
  shareReplay,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { httpStatusOf } from '../http/api-error';
import { AccessTokenStore } from './access-token.store';
import { RefreshResponse } from './auth.models';

/** Nome do Web Lock que serializa o refresh entre as abas do mesmo browser. */
export const REFRESH_LOCK_NAME = 'dutrail-refresh';

/** Espera antes de repetir um refresh que falhou por erro de rede. */
export const NETWORK_RETRY_DELAY_MS = 300;

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
 * Entre abas, o mesmo cookie é compartilhado: o refresh roda dentro do Web Lock
 * `dutrail-refresh`, então uma aba espera a outra terminar e já sai com o
 * cookie novo. Sem a API (SSR, testes, browsers antigos), roda sem lock.
 *
 * Erro de rede (status 0) é repetido **uma vez**, logo em seguida: a renovação
 * pode ter acontecido e só a resposta se perdido, e a API aceita reapresentar o
 * token antigo dentro da janela de tolerância (30 s). Qualquer outro erro não
 * se repete.
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
  private readonly locks = inject(DOCUMENT).defaultView?.navigator?.locks;

  private inFlight: Observable<string> | null = null;

  /** Emite o novo access token (e já o guarda no `AccessTokenStore`). */
  refresh(): Observable<string> {
    this.inFlight ??= this.withRefreshLock(() =>
      this.http
        // Corpo vazio de propósito. No fluxo web o refresh token vai sozinho no
        // cookie httpOnly. Mandá-lo também no corpo é "token no canal errado"
        // e a API responde 400.
        .post<RefreshResponse>(`${this.apiBaseUrl}/auth/refresh`, null)
        .pipe(
          retry({
            count: 1,
            delay: (error: unknown) =>
              httpStatusOf(error) === 0 ? timer(NETWORK_RETRY_DELAY_MS) : throwError(() => error),
          }),
        ),
    ).pipe(
      map(({ accessToken }) => accessToken),
      tap((accessToken) => this.accessTokenStore.set(accessToken)),
      // Liberado ao terminar (com sucesso ou erro), para que um 401 futuro
      // dispare um refresh novo em vez de reaproveitar este.
      finalize(() => (this.inFlight = null)),
      shareReplay(1),
    );

    return this.inFlight;
  }

  private withRefreshLock<T>(work: () => Observable<T>): Observable<T> {
    const locks = this.locks;
    if (!locks) {
      return work();
    }
    // O lock fica preso até a request (com a eventual repetição) terminar.
    return defer(() => locks.request(REFRESH_LOCK_NAME, () => firstValueFrom(work())));
  }
}
