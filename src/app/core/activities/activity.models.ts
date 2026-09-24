/**
 * Tipos de atividade, espelhando a `dutrail-api`
 * (`dutrail-api/docs/ACTIVITIES-CONTRACT.md`).
 *
 * - `GET /activities?limit=&cursor=`: página de atividades do usuário logado
 *   (`ActivityPage`), mais recentes primeiro.
 * - `GET /activities/:id`: uma `Activity`, sem envelope. Id inexistente, de
 *   outro usuário ou malformado recebem o mesmo 404: a API não revela se o id
 *   existe para outra pessoa.
 *
 * Campos sem dado vêm como `null`, nunca omitidos; `null` significa "sem
 * dado", não zero.
 */

/**
 * Modalidade, com os nomes do campo `sport` do protocolo FIT. A API pode
 * passar a mandar valores novos; a tela os trata como `other`.
 */
export type ActivitySport = 'running' | 'cycling' | 'walking' | 'hiking' | 'swimming' | 'other';

export interface Activity {
  id: string;
  /** Dono da atividade. É sempre o usuário logado. */
  userId: string;
  name: string;
  sport: ActivitySport;
  /** Início da atividade, instante UTC em ISO 8601 (o JSON não tem tipo Date). */
  startedAt: string;
  /** Tempo total em segundos inteiros, pausas incluídas. */
  elapsedTimeSeconds: number;
  /** Tempo em movimento, em segundos inteiros. */
  movingTimeSeconds: number | null;
  /** Metros; pode ter casas decimais. Nula em atividades sem GPS/distância. */
  distanceMeters: number | null;
  /** Metros; pode ter casas decimais. */
  elevationGainMeters: number | null;
  /** bpm, inteiro. */
  averageHeartRateBpm: number | null;
  /** bpm, inteiro. */
  maxHeartRateBpm: number | null;
  /** kcal, inteiro. */
  calories: number | null;
  /** Quando a atividade foi registrada no Dutrail, ISO 8601. */
  createdAt: string;
  /** Última alteração do registro, ISO 8601. Hoje igual a `createdAt` (não há edição). */
  updatedAt: string;
}

/** Resposta de `GET /activities`. */
export interface ActivityPage {
  items: Activity[];
  /** Vai em `?cursor=` para buscar a próxima página; `null` = fim da lista. */
  nextCursor: string | null;
}
