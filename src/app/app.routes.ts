import { Route, Routes } from '@angular/router';
import { authenticatedGuard } from './core/auth/authenticated.guard';

/**
 * Rota de uma tela planejada que ainda não existe: abre a página "em
 * construção" no caminho definitivo, para a sidebar já apontar para ele.
 */
function comingSoon(path: string, feature: string): Route {
  return {
    path,
    title: `${feature} | Dutrail`,
    data: { feature },
    loadComponent: () =>
      import('./features/coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
  };
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dutrail',
    loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPage),
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    // Área logada. O guard fica aqui, então toda rota filha já nasce protegida.
    // As features são montadas neste arquivo (e não dentro do app-shell)
    // porque uma feature não importa outra.
    path: 'app',
    canMatch: [authenticatedGuard],
    loadComponent: () => import('./features/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'feed' },
      {
        path: 'feed',
        title: 'Início | Dutrail',
        loadComponent: () => import('./features/feed/feed.page').then((m) => m.FeedPage),
      },
      // Antes de `activities`: senão "calendar" seria lido como o `:id` de
      // uma atividade pelas rotas da feature.
      comingSoon('activities/calendar', 'Calendário'),
      {
        path: 'activities',
        loadChildren: () =>
          import('./features/activities/activities.routes').then((m) => m.activitiesRoutes),
      },
      comingSoon('dashboard', 'Painel'),
      comingSoon('notifications', 'Notificações'),
      comingSoon('routes/explore', 'Explorar rotas'),
      comingSoon('routes/saved', 'Rotas salvas'),
      comingSoon('training/workouts', 'Treinos'),
      comingSoon('training/performance', 'Desempenho'),
      comingSoon('settings/general', 'Configurações gerais'),
      { path: '**', redirectTo: 'feed' },
    ],
  },
  { path: '**', redirectTo: '' },
];
