import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Como cada rota é entregue pelo servidor Node (renderização híbrida).
 *
 * Regra geral: o servidor nunca conhece a sessão. O refresh token é um cookie
 * httpOnly com `Path=/api/auth`, que o browser só manda para a API, e o
 * `AuthService` não restaura sessão fora do browser. Toda página gerada no
 * servidor é a versão "deslogada", igual para qualquer visitante; o que
 * depende do usuário acontece no cliente.
 *
 * - Landing, login e cadastro: `Prerender`. O conteúdo é 100% estático (não
 *   busca dados nem lê a request), então é gerado uma vez no build e servido
 *   do disco, com o HTML completo para buscadores e primeira pintura. Quem já
 *   está logado é mandado para `/app` pelo `guestOnlyGuard`, no browser, depois
 *   da hidratação.
 * - Callback do Google: `Client`. Só existe para trocar o `code` da URL pela
 *   sessão, o que tem que acontecer no browser (é lá que o cookie é gravado).
 *   No servidor seria só um spinner, e o código de uso único não pode correr
 *   o risco de ser consumido fora do browser.
 * - Área logada (`/app` e tudo abaixo): `Client`. O servidor entrega só o
 *   shell da SPA; o guard restaura a sessão no browser e as telas buscam os
 *   dados do usuário de lá.
 * - Resto (`**`): `Server`. O router manda qualquer caminho desconhecido para a
 *   landing, e assim o servidor já responde com o redirect (302), sem baixar
 *   e rodar o app só para descobrir isso.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'signup', renderMode: RenderMode.Prerender },
  { path: 'auth/callback', renderMode: RenderMode.Client },
  { path: 'app', renderMode: RenderMode.Client },
  { path: 'app/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
