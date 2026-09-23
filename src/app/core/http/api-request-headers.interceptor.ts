import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AccessTokenStore } from '../auth/access-token.store';
import { API_BASE_URL, isApiUrl } from './api-base-url';

/**
 * Adiciona a toda request para a API o que o contrato exige do cliente web:
 *
 * - `X-Client-Type: web`: a API não tem default. Sem o header, as rotas de token
 *   respondem 400 em vez do erro esperado. É também esse header que faz o
 *   refresh token viajar num cookie httpOnly em vez de no corpo da resposta.
 * - `withCredentials: true`: sem isso o browser nem envia o cookie do refresh
 *   token (`Path=/auth`) nem aceita o `Set-Cookie` de uma origem diferente
 *   (`:4200` → `:3000`).
 * - `Authorization: Bearer <access token>`, quando há sessão.
 *
 * Requests para outras origens passam intactas: credenciais e token nunca vão
 * para terceiros.
 *
 * O access token é lido no momento da request (e não quando ela foi criada).
 * Por isso, quando o `refreshOnUnauthorizedInterceptor` repete uma request
 * depois de renovar a sessão, a nova tentativa já sai com o token novo.
 */
export const apiRequestHeadersInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBaseUrl = inject(API_BASE_URL);
  if (!isApiUrl(req.url, apiBaseUrl)) {
    return next(req);
  }

  const accessToken = inject(AccessTokenStore).token();

  return next(
    req.clone({
      withCredentials: true,
      setHeaders: {
        'X-Client-Type': 'web',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    }),
  );
};
