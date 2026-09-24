/**
 * Caminhos absolutos das telas, usados por guards, redirects e pela navegação
 * da área logada.
 *
 * Ficam no `core` porque guards e features precisam dos mesmos valores e uma
 * feature não pode importar as rotas de outra.
 */
export const AppPaths = {
  landing: '/',
  login: '/login',
  signup: '/signup',
  /** Raiz da área logada. Redireciona para o feed. */
  home: '/app',

  feed: '/app/feed',
  activities: '/app/activities',
  activityDetail: (id: string) => `/app/activities/${encodeURIComponent(id)}`,

  // Telas planejadas, ainda sem implementação. Abrem a página "em construção"
  // para já fixar a navegação do produto; ver `app.routes.ts`.
  dashboard: '/app/dashboard',
  notifications: '/app/notifications',
  activitiesCalendar: '/app/activities/calendar',
  routesExplore: '/app/routes/explore',
  routesSaved: '/app/routes/saved',
  trainingWorkouts: '/app/training/workouts',
  trainingPerformance: '/app/training/performance',
  settingsGeneral: '/app/settings/general',
} as const;
