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
 * Se a URL é de uma rota `/auth/*` da API (login, signup, refresh, logout,
 * exchange do Google).
 */
export function isAuthEndpoint(url: string, apiBaseUrl: string): boolean {
  return url.startsWith(`${apiBaseUrl}/auth/`);
}
