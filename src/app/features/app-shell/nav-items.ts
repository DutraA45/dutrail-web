import {
  lucideActivity,
  lucideBell,
  lucideDumbbell,
  lucideHouse,
  lucideLayoutDashboard,
  lucideMap,
  lucideSettings,
} from '@ng-icons/lucide';
import { AppPaths } from '../../core/navigation/app-paths';

export interface NavLink {
  label: string;
  path: string;
  /** Só fica ativo na rota exata (e não em rotas filhas). */
  exact?: boolean;
}

export interface NavSection {
  label: string;
  /** Nome do ícone lucide; o ícone precisa estar em `navIcons`. */
  icon: keyof typeof navIcons;
  /** Rota da própria seção. Seções sem rota só abrem e fecham o submenu. */
  path?: string;
  /** Prefixo de URL que deixa a seção destacada e com o submenu aberto. */
  activePrefix?: string;
  children?: readonly NavLink[];
}

export const navIcons = {
  lucideActivity,
  lucideBell,
  lucideDumbbell,
  lucideHouse,
  lucideLayoutDashboard,
  lucideMap,
  lucideSettings,
};

/**
 * Navegação principal da área logada.
 *
 * Inclui as telas planejadas que ainda não existem (painel, notificações,
 * calendário, rotas, treino, configurações) para já fixar a estrutura do
 * produto; elas abrem a página "em construção". "Equipe" ficou de fora das
 * configurações: o Dutrail é um app de atleta individual, e a parte social
 * (amigos) vive no feed, não numa conta de equipe.
 */
export const NAV_SECTIONS: readonly NavSection[] = [
  { label: 'Início', icon: 'lucideHouse', path: AppPaths.feed },
  { label: 'Painel', icon: 'lucideLayoutDashboard', path: AppPaths.dashboard },
  { label: 'Notificações', icon: 'lucideBell', path: AppPaths.notifications },
  {
    label: 'Atividades',
    icon: 'lucideActivity',
    path: AppPaths.activities,
    activePrefix: AppPaths.activities,
    children: [
      // Exata para não ficar ativa junto com o calendário (`/activities/calendar`).
      { label: 'Todas as atividades', path: AppPaths.activities, exact: true },
      { label: 'Calendário', path: AppPaths.activitiesCalendar },
    ],
  },
  {
    label: 'Rotas',
    icon: 'lucideMap',
    activePrefix: '/app/routes',
    children: [
      { label: 'Explorar', path: AppPaths.routesExplore },
      { label: 'Salvas', path: AppPaths.routesSaved },
    ],
  },
  {
    label: 'Treino',
    icon: 'lucideDumbbell',
    activePrefix: '/app/training',
    children: [
      { label: 'Treinos', path: AppPaths.trainingWorkouts },
      { label: 'Desempenho', path: AppPaths.trainingPerformance },
    ],
  },
  {
    label: 'Configurações',
    icon: 'lucideSettings',
    activePrefix: '/app/settings',
    children: [{ label: 'Geral', path: AppPaths.settingsGeneral }],
  },
];
