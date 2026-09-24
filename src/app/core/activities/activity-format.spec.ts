import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { formatDistance, formatDuration, sportLabel, summaryMetrics } from './activity-format';
import { Activity, ActivitySport } from './activity.models';

registerLocaleData(localePt);

const activity: Activity = {
  id: 'a1',
  userId: 'u1',
  name: 'Longão de domingo',
  sport: 'running',
  startedAt: '2026-09-20T09:00:00.000Z',
  elapsedTimeSeconds: 4000,
  movingTimeSeconds: 3725,
  distanceMeters: 12345,
  elevationGainMeters: null,
  averageHeartRateBpm: null,
  maxHeartRateBpm: null,
  calories: null,
  createdAt: '2026-09-20T12:00:00.000Z',
  updatedAt: '2026-09-20T12:00:00.000Z',
};

describe('activity-format', () => {
  it('formats durations with and without hours', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(2530)).toBe('42:10');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats distances in km, or in meters below 1 km, using the locale', () => {
    expect(formatDistance(12345, 'pt-BR')).toBe('12,35 km');
    expect(formatDistance(850, 'pt-BR')).toBe('850 m');
  });

  it('falls back to a generic label for sports the frontend does not know yet', () => {
    expect(sportLabel('cycling')).toBe('Ciclismo');
    expect(sportLabel('rowing' as ActivitySport)).toBe('Outra');
  });

  it('summarizes with moving time and skips metrics the activity does not have', () => {
    expect(summaryMetrics(activity, 'pt-BR')).toEqual([
      { label: 'Distância', value: '12,35 km' },
      { label: 'Duração', value: '1:02:05' },
    ]);
  });
});
