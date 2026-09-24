import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Activity } from '../../core/activities/activity.models';
import { ActivityApi } from '../../core/activities/activity-api';
import { AuthService } from '../../core/auth/auth.service';
import { CursorPage } from '../../core/http/cursor-pager';

/** Autor de uma atividade no feed: o próprio usuário ou (no futuro) um amigo. */
export interface FeedAthlete {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface FeedItem {
  activity: Activity;
  athlete: FeedAthlete;
}

/**
 * Monta o feed da home: atividades do usuário e dos amigos dele, mais
 * recentes primeiro, paginadas por cursor.
 *
 * TODO(api): hoje o feed tem só as atividades do próprio usuário
 * (`GET /activities`, que já vem ordenado). A API ainda não tem o conceito de
 * amigos nem um endpoint de feed. Juntar várias fontes aqui não funcionaria
 * com paginação (cada fonte teria seu cursor e a ordem entre páginas se
 * perderia), então o feed de amigos precisa vir pronto do servidor, ex.
 * `GET /feed?cursor=`, com o autor em cada item. Quando existir, ele substitui
 * `listMine()` aqui e a página não muda: o `FeedItem` já carrega o autor.
 */
@Service()
export class FeedService {
  private readonly activityApi = inject(ActivityApi);
  private readonly auth = inject(AuthService);

  loadPage(cursor: string | null): Observable<CursorPage<FeedItem>> {
    return this.activityApi.listMine({ cursor }).pipe(
      map(({ items, nextCursor }) => {
        const athlete = this.currentAthlete();
        return {
          items: items.map((activity) => ({
            activity,
            athlete: athlete ?? { id: activity.userId, name: null, avatarUrl: null },
          })),
          nextCursor,
        };
      }),
    );
  }

  private currentAthlete(): FeedAthlete | null {
    const user = this.auth.currentUser();
    return user ? { id: user.id, name: user.name ?? user.email, avatarUrl: user.avatarUrl } : null;
  }
}
