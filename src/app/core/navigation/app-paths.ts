/**
 * Caminhos absolutos das telas, usados por guards e redirects.
 *
 * Ficam no `core` porque guards e features precisam dos mesmos valores e uma
 * feature não pode importar as rotas de outra.
 */
export const AppPaths = {
  landing: '/',
  login: '/login',
  signup: '/signup',
  /** Raiz da área logada. */
  home: '/app',
} as const;
