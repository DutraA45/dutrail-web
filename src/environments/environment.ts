/**
 * Configuração de ambiente.
 *
 * A API é servida pela **mesma origem** do frontend, sob `/api`: em produção o
 * Nginx encaminha `/api/` para o NestJS; em desenvolvimento o `ng serve` faz o
 * mesmo com o `proxy.conf.json`. Por isso a base é relativa: sem CORS, e o
 * cookie do refresh token (`Path=/api/auth`) é enviado pelo próprio browser.
 */
export const environment = {
  apiBaseUrl: '/api',
};
