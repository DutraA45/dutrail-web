import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * URL base da `dutrail-api`, sem barra final.
 *
 * É um token (e não um import direto do `environment`) para que testes e
 * ambientes diferentes possam apontar para outra API sem tocar no código.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

/** Se a URL é de uma chamada para a nossa API (e não para um serviço de terceiros). */
export function isApiUrl(url: string, apiBaseUrl: string): boolean {
  return url.startsWith(`${apiBaseUrl}/`);
}

/**
 * Rotas de autenticação em que um 401 tem significado próprio (credenciais
 * erradas, sessão encerrada, código do Google inválido) e **nunca** dispara
 * refresh. Caminhos exatos do contrato. `/auth/logout-all` fica de fora de
 * propósito: usa Bearer e, como `/me`, renova a sessão no 401.
 */
const NO_REFRESH_AUTH_PATHS: ReadonlySet<string> = new Set([
  '/auth/signup',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/google/exchange',
]);

/**
 * Se a URL é de uma das rotas de autenticação que não disparam refresh no 401
 * (signup, login, refresh, logout, exchange do Google), pelo caminho exato e
 * sem query string.
 */
export function isAuthEndpoint(url: string, apiBaseUrl: string): boolean {
  const path = apiPathOf(url, apiBaseUrl);
  return path !== null && NO_REFRESH_AUTH_PATHS.has(path);
}

/**
 * Caminho de uma URL da API, sem a base e sem query string ou fragmento (ex.
 * `/me`), ou `null` se a URL não é da nossa API. Serve para comparar rotas
 * pelo caminho exato.
 */
export function apiPathOf(url: string, apiBaseUrl: string): string | null {
  if (!isApiUrl(url, apiBaseUrl)) {
    return null;
  }
  return url.slice(apiBaseUrl.length).split(/[?#]/, 1)[0];
}
