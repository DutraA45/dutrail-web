import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/auth/authenticated.guard';

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
    path: 'app',
    canMatch: [authenticatedGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.dashboardRoutes),
  },
  { path: '**', redirectTo: '' },
];
