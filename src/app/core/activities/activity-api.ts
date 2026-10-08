import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../http/api-base-url';
import { Activity, ActivityPage } from './activity.models';

export interface ActivityPageRequest {
  /** `nextCursor` da página anterior, repassado sem alteração. Omita na primeira. */
  cursor?: string | null;
  /** De 1 a 100. Omitido, a API usa 20. */
  limit?: number;
}

/**
 * Acesso às rotas `/activities` da API.
 *
 * Fica no `core` porque feed, lista e detalhe consomem as mesmas atividades.
 */
@Service()
export class ActivityApi {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /** Uma página das atividades do usuário logado, da mais recente para a mais antiga. */
  listMine({ cursor, limit }: ActivityPageRequest = {}): Observable<ActivityPage> {
    // Só `limit` e `cursor`, e só quando definidos: a API responde 400 para
    // qualquer outro parâmetro de query. O `HttpParams` codifica o cursor.
    let params = new HttpParams();
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    if (limit !== undefined) {
      params = params.set('limit', limit);
    }
    return this.http.get<ActivityPage>(`${this.apiBaseUrl}/activities`, { params });
  }

  getById(id: string): Observable<Activity> {
    return this.http.get<Activity>(`${this.apiBaseUrl}/activities/${encodeURIComponent(id)}`);
  }

  /**
   * Envia um arquivo `.fit` para a API criar a atividade a partir dele
   * (multipart com o campo `file`). O `Content-Type` não é definido aqui de
   * propósito: com `FormData` o browser gera o `multipart/form-data` com o
   * boundary correto.
   */
  importFitFile(file: File): Observable<Activity> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<Activity>(`${this.apiBaseUrl}/activities/import`, body);
  }
}
