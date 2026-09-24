import { formatNumber } from '@angular/common';
import { Activity, ActivitySport } from './activity.models';

/**
 * Formatação das métricas de atividade para exibição.
 *
 * Fica junto do modelo porque feed, lista e detalhe mostram as mesmas
 * métricas e precisam delas com o mesmo formato. Recebe o `locale` (e não usa
 * `Intl` com locale fixo) para seguir o `LOCALE_ID` do app.
 */

const SPORT_LABELS: Readonly<Record<ActivitySport, string>> = {
  running: 'Corrida',
  cycling: 'Ciclismo',
  walking: 'Caminhada',
  hiking: 'Trilha',
  swimming: 'Natação',
  other: 'Outra',
};

export function sportLabel(sport: ActivitySport): string {
  // A API pode passar a mandar modalidades novas antes do frontend conhecê-las.
  return SPORT_LABELS[sport] ?? SPORT_LABELS.other;
}

/** `12,35 km` (ou `850 m` abaixo de 1 km). */
export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) {
    return `${formatNumber(meters, locale, '1.0-0')} m`;
  }
  return `${formatNumber(meters / 1000, locale, '1.2-2')} km`;
}

/** `1:02:05` com horas, `42:10` sem. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatElevation(meters: number, locale: string): string {
  return `${formatNumber(meters, locale, '1.0-0')} m`;
}

export interface ActivityMetric {
  label: string;
  value: string;
}

/**
 * Métricas de resumo (as que aparecem em cartões e listas), omitindo as que a
 * atividade não tem. A duração é o tempo em movimento quando existe, que é o
 * que o atleta costuma querer ver; senão, o tempo total.
 */
export function summaryMetrics(activity: Activity, locale: string): ActivityMetric[] {
  const metrics: ActivityMetric[] = [];
  if (activity.distanceMeters !== null) {
    metrics.push({ label: 'Distância', value: formatDistance(activity.distanceMeters, locale) });
  }
  metrics.push({
    label: 'Duração',
    value: formatDuration(activity.movingTimeSeconds ?? activity.elapsedTimeSeconds),
  });
  if (activity.elevationGainMeters !== null) {
    metrics.push({
      label: 'Ganho de elevação',
      value: formatElevation(activity.elevationGainMeters, locale),
    });
  }
  return metrics;
}
