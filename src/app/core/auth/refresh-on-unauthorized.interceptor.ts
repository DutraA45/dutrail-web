import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL, isApiUrl, isAuthEndpoint } from '../http/api-base-url';
import { httpStatusOf, isTransientHttpError } from '../http/api-error';
import { AppPaths } from '../navigation/app-paths';
import { AuthService } from './auth.service';
import { TokenRefreshService } from './token-refresh.service';

/**
 * Quando uma request para a API volta 401 (access token expirado), renova a
 * sessão com `/auth/refresh` e repete a request **uma vez**.
 *
 * - As rotas de autenticação sem Bearer (ver `isAuthEndpoint`) não passam por
 *   aqui. Um 401 de `/auth/login` significa credenciais erradas, e um 401 de
 *   `/auth/refresh` significa que a sessão acabou. Tentar "renovar" nesses
 *   casos criaria um laço infinito (refresh → 401 → refresh → ...).
 *   `/auth/logout-all` usa Bearer e passa por aqui como qualquer outra rota.
 * - Requests concorrentes que recebem 401 juntas esperam o mesmo refresh (ver
 *   `TokenRefreshService`).
 * - Se o próprio refresh for recusado (401), a sessão acabou de fato: limpa o
 *   estado local e manda para o login.
 * - Se o refresh falhar por rede, 429 ou 5xx, a sessão continua e quem chamou
 *   recebe o erro do refresh.
 *
 * Deve ser registrado **antes** do `apiRequestHeadersInterceptor`. Assim, ao
 * repetir a request, ela passa de novo pelo interceptor de headers e sai com o
 * access token recém-emitido.
 */
export const refreshOnUnauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  if (!isApiUrl(req.url, apiBaseUrl) || isAuthEndpoint(req.url, apiBaseUrl)) {
    return next(req);
  }

  const tokenRefresh = inject(TokenRefreshService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== HttpStatusCode.Unauthorized) {
        return throwError(() => error);
      }

      return tokenRefresh.refresh().pipe(
        catchError((refreshError: unknown) => {
          // Só 401 significa "sessão encerrada". Falha de rede, 429 ou 5xx no
          // refresh não é motivo para deslogar, e a sessão pode estar viva: a
          // tela recebe o erro do refresh, e não o 401 original ("Sua sessão
          // expirou").
          if (isTransientHttpError(refreshError)) {
            return throwError(() => refreshError);
          }
          if (httpStatusOf(refreshError) === HttpStatusCode.Unauthorized) {
            auth.clearLocalSession();
            void router.navigateByUrl(AppPaths.login);
          }
          return throwError(() => error);
        }),
        // Repete uma única vez. Se voltar 401 de novo, o erro segue para quem
        // chamou (a nova tentativa vai direto para `next`, sem passar por este
        // interceptor outra vez).
        switchMap(() => next(req)),
      );
    }),
  );
};
