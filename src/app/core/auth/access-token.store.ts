import { Service, signal } from '@angular/core';

/**
 * Guarda o access token atual.
 *
 * Fica só em memória, de propósito: nada de `localStorage`/`sessionStorage`,
 * onde qualquer script injetado (XSS) conseguiria lê-lo. Perder o token ao
 * recarregar a página não é um problema: o refresh token está num cookie
 * httpOnly e a sessão é restaurada com `POST /auth/refresh`.
 *
 * É um serviço separado, sem dependências, para que o interceptor de headers
 * possa lê-lo sem depender do `HttpClient`.
 */
@Service()
export class AccessTokenStore {
  private readonly current = signal<string | null>(null);

  readonly token = this.current.asReadonly();

  set(token: string): void {
    this.current.set(token);
  }

  clear(): void {
    this.current.set(null);
  }
}
