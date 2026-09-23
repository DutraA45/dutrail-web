import { Routes } from '@angular/router';

/**
 * Rotas da área logada. O `authenticatedGuard` fica na rota-mãe (`/app`), em
 * `app.routes.ts`, então tudo o que for adicionado aqui já nasce protegido.
 */
export const dashboardRoutes: Routes = [
  {
    path: '',
    title: 'Início | Dutrail',
    loadComponent: () => import('./dashboard-home.page').then((m) => m.DashboardHomePage),
  },
];
