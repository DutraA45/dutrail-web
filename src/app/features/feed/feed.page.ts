import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { describeApiError } from '../../core/http/api-error';
import { injectCursorPager } from '../../core/http/cursor-pager';
import { AppPaths } from '../../core/navigation/app-paths';
import { ErrorAlert } from '../../shared/ui/error-alert';
import { LoadMore } from '../../shared/ui/load-more';
import { FeedItemCard } from './feed-item-card';
import { FeedService } from './feed.service';

/**
 * Home da área logada: feed de atividades, da mais recente para a mais antiga.
 * Por enquanto só com as do próprio usuário (ver `FeedService`).
 */
@Component({
  selector: 'app-feed-page',
  imports: [
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmCardImports,
    HlmEmptyImports,
    HlmSkeletonImports,
    ErrorAlert,
    LoadMore,
    FeedItemCard,
  ],
  providers: [provideIcons({ lucideActivity })],
  template: `
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Início</h1>
        <p class="text-muted-foreground text-sm">Suas atividades mais recentes.</p>
      </header>

      @if (feed.isLoading()) {
        <div class="flex flex-col gap-4" role="status">
          <span class="sr-only">Carregando atividades…</span>
          @for (placeholder of [1, 2, 3]; track placeholder) {
            <div hlmCard aria-hidden="true">
              <div hlmCardHeader class="gap-3">
                <div class="flex items-center gap-3">
                  <hlm-skeleton class="size-8 rounded-full" />
                  <hlm-skeleton class="h-4 w-40" />
                </div>
                <hlm-skeleton class="h-5 w-56" />
              </div>
              <div hlmCardContent class="flex gap-8">
                <hlm-skeleton class="h-10 w-20" />
                <hlm-skeleton class="h-10 w-20" />
              </div>
            </div>
          }
        </div>
      } @else if (errorMessages(); as messages) {
        <div class="flex flex-col items-start gap-3">
          <app-error-alert title="Não foi possível carregar o feed." [messages]="messages" />
          <button hlmBtn variant="outline" type="button" (click)="feed.reload()">
            Tentar novamente
          </button>
        </div>
      } @else if (items().length === 0) {
        <div hlmEmpty class="border">
          <div hlmEmptyHeader>
            <div hlmEmptyMedia variant="icon">
              <ng-icon name="lucideActivity" aria-hidden="true" />
            </div>
            <h2 hlmEmptyTitle>Nenhuma atividade ainda</h2>
            <p hlmEmptyDescription>
              Importe um arquivo .fit do seu relógio ou ciclocomputador para começar.
            </p>
          </div>
          <div hlmEmptyContent>
            <a hlmBtn [routerLink]="paths.activities">Ir para atividades</a>
          </div>
        </div>
      } @else {
        <ul class="flex flex-col gap-4" aria-label="Atividades">
          @for (item of items(); track item.activity.id) {
            <li><app-feed-item-card [item]="item" /></li>
          }
        </ul>
        <app-load-more
          [hasMore]="feed.hasMore()"
          [loading]="feed.isLoadingMore()"
          [errorMessages]="loadMoreErrorMessages()"
          [loadedLabel]="items().length + ' atividades carregadas'"
          (loadMore)="feed.loadMore()"
        />
      }
    </div>
  `,
})
export class FeedPage {
  private readonly feedService = inject(FeedService);

  protected readonly paths = AppPaths;
  protected readonly feed = injectCursorPager((cursor) => this.feedService.loadPage(cursor));

  protected readonly items = this.feed.items;
  protected readonly errorMessages = computed(() => {
    const error = this.feed.error();
    return error ? describeApiError(error) : null;
  });
  protected readonly loadMoreErrorMessages = computed(() => {
    const error = this.feed.loadMoreError();
    return error ? describeApiError(error) : null;
  });
}
