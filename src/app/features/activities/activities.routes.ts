import { Routes } from '@angular/router';

/** Rotas de atividades (`/app/activities`). Cada tela é carregada sob demanda. */
export const activitiesRoutes: Routes = [
  {
    path: '',
    title: 'Atividades | Dutrail',
    loadComponent: () => import('./list/activity-list.page').then((m) => m.ActivityListPage),
  },
  {
    path: ':id',
    title: 'Atividade | Dutrail',
    loadComponent: () => import('./detail/activity-detail.page').then((m) => m.ActivityDetailPage),
  },
];
