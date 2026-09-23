import { Routes } from '@angular/router';
import { guestOnlyGuard } from '../../core/auth/guest-only.guard';

/**
 * Rotas públicas de autenticação. Cada tela é carregada sob demanda.
 *
 * O callback do Google não tem `guestOnlyGuard`: ele precisa trocar o código
 * mesmo que exista uma sessão anterior, e o guard dispararia um
 * `/auth/refresh` desnecessário antes da troca.
 */
export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Entrar | Dutrail',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    title: 'Criar conta | Dutrail',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./signup/signup.page').then((m) => m.SignupPage),
  },
  {
    // Caminho fixo: é para onde a API redireciona (`{FRONTEND_URL}/auth/callback`).
    path: 'auth/callback',
    title: 'Entrando | Dutrail',
    loadComponent: () =>
      import('./google-callback/google-callback.page').then((m) => m.GoogleCallbackPage),
  },
];
