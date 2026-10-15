import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * URL base da `dutrail-api`, sem barra final: `/api`, relativa à origem do
 * próprio frontend (ver `environment.ts`). É o único lugar que define onde a
 * API está; todo serviço monta suas URLs a partir dele.
 *
 * É um token (e não um import direto do `environment`) para que os testes
 * possam injetar outro valor sem tocar no código.
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
 * refresh. Caminhos exatos do contrato, com o prefixo `/api`.
 * `/api/auth/logout-all` fica de fora de propósito: usa Bearer e, como
 * `/api/me`, renova a sessão no 401.
 */
const NO_REFRESH_AUTH_PATHS: ReadonlySet<string> = new Set([
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/google/exchange',
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
 * Caminho de uma URL da API, com o prefixo `/api` e sem query string ou
 * fragmento (ex. `/api/me`), ou `null` se a URL não é da nossa API. Serve para
 * comparar rotas pelo caminho exato, como o contrato as escreve.
 */
export function apiPathOf(url: string, apiBaseUrl: string): string | null {
  if (!isApiUrl(url, apiBaseUrl)) {
    return null;
  }
  // A base é relativa (`/api`), então a URL da request já é o caminho. Uma URL
  // absoluta (base apontando para outra origem) também funciona.
  return URL.canParse(url) ? new URL(url).pathname : url.split(/[?#]/, 1)[0];
}
