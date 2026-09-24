import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, LOCALE_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { sportLabel, summaryMetrics } from '../../core/activities/activity-format';
import { AppPaths } from '../../core/navigation/app-paths';
import { FeedItem } from './feed.service';

/** Uma atividade no feed: autor, nome (com link para o detalhe), data e métricas. */
@Component({
  selector: 'app-feed-item-card',
  imports: [DatePipe, RouterLink, HlmAvatarImports, HlmBadgeImports, HlmCardImports],
  template: `
    <article hlmCard>
      <div hlmCardHeader>
        <div class="flex items-center gap-3">
          <hlm-avatar>
            @if (item().athlete.avatarUrl; as avatarUrl) {
              <img hlmAvatarImage [src]="avatarUrl" alt="" referrerpolicy="no-referrer" />
            }
            <!-- As cores padrão do fallback (muted) não chegam ao contraste AA. -->
            <span hlmAvatarFallback class="text-foreground" aria-hidden="true">{{
              athleteInitial()
            }}</span>
          </hlm-avatar>
          <div class="min-w-0 text-sm">
            <p class="truncate font-medium">{{ item().athlete.name ?? 'Atleta' }}</p>
            <p class="text-muted-foreground">
              <time [attr.datetime]="activity().startedAt">
                {{ activity().startedAt | date: "d 'de' MMMM 'de' y 'às' HH:mm" }}
              </time>
            </p>
          </div>
          <span hlmBadge variant="secondary" class="ms-auto">{{ sport() }}</span>
        </div>
        <h2 hlmCardTitle class="mt-2">
          <a
            [routerLink]="detailPath()"
            class="focus-visible:ring-ring rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {{ activity().name }}
          </a>
        </h2>
      </div>
      <div hlmCardContent>
        <dl class="flex flex-wrap gap-x-8 gap-y-2">
          @for (metric of metrics(); track metric.label) {
            <div>
              <dt class="text-muted-foreground text-xs">{{ metric.label }}</dt>
              <dd class="text-lg font-semibold tabular-nums">{{ metric.value }}</dd>
            </div>
          }
        </dl>
      </div>
    </article>
  `,
})
export class FeedItemCard {
  private readonly locale = inject(LOCALE_ID);

  readonly item = input.required<FeedItem>();

  protected readonly activity = computed(() => this.item().activity);
  protected readonly sport = computed(() => sportLabel(this.activity().sport));
  protected readonly metrics = computed(() => summaryMetrics(this.activity(), this.locale));
  protected readonly detailPath = computed(() => AppPaths.activityDetail(this.activity().id));
  protected readonly athleteInitial = computed(() =>
    (this.item().athlete.name ?? '?').charAt(0).toUpperCase(),
  );
}
