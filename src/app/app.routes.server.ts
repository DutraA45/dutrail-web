import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Só telas públicas e sem estado são pré-renderizadas no build.
 *
 * A área logada e o callback do Google dependem da sessão do usuário, que só
 * existe no browser: o refresh token está num cookie httpOnly da API, que o
 * servidor do frontend nunca vê. Renderizá-los no servidor produziria sempre a
 * versão "deslogada" (ou um redirect errado para o login).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'signup', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
