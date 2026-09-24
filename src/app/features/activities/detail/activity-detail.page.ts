import { DatePipe, formatNumber } from '@angular/common';
import { HttpStatusCode } from '@angular/common/http';
import { Component, computed, effect, inject, input, LOCALE_ID } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideSearchX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import {
  ActivityMetric,
  formatDistance,
  formatDuration,
  formatElevation,
  sportLabel,
} from '../../../core/activities/activity-format';
import { Activity } from '../../../core/activities/activity.models';
import { ActivityApi } from '../../../core/activities/activity-api';
import { describeApiError, httpStatusOf } from '../../../core/http/api-error';
import { AppPaths } from '../../../core/navigation/app-paths';
import { ErrorAlert } from '../../../shared/ui/error-alert';

/**
 * Como a tela reage a uma falha ao buscar a atividade.
 *
 * - `not-found`: 404. A API responde exatamente o mesmo 404 para id
 *   inexistente, de outro usuário ou malformado (para não revelar se o id
 *   existe para outra pessoa), então a tela também não distingue os casos.
 * - `other`: rede, 5xx etc. É o único caso em que tentar de novo ajuda.
 */
type LoadFailure = { kind: 'not-found' } | { kind: 'other'; messages: string[] };

function classifyFailure(error: unknown): LoadFailure {
  return httpStatusOf(error) === HttpStatusCode.NotFound
    ? { kind: 'not-found' }
    : { kind: 'other', messages: describeApiError(error) };
}

/** Todos os dados de uma atividade (`/app/activities/:id`). */
@Component({
  selector: 'app-activity-detail-page',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmCardImports,
    HlmEmptyImports,
    HlmSkeletonImports,
    ErrorAlert,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideSearchX })],
  template: `
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <a hlmBtn variant="ghost" size="sm" class="self-start" [routerLink]="paths.activities">
        <ng-icon name="lucideArrowLeft" aria-hidden="true" />
        Voltar para atividades
      </a>

      @if (activity.isLoading()) {
        <div hlmCard role="status">
          <span class="sr-only">Carregando atividade…</span>
          <div hlmCardHeader class="gap-3" aria-hidden="true">
            <hlm-skeleton class="h-7 w-64" />
            <hlm-skeleton class="h-4 w-40" />
          </div>
          <div hlmCardContent class="grid grid-cols-2 gap-6 sm:grid-cols-3" aria-hidden="true">
            @for (placeholder of [1, 2, 3, 4, 5, 6]; track placeholder) {
              <hlm-skeleton class="h-10 w-full" />
            }
          </div>
        </div>
      } @else if (failure(); as failure) {
        @switch (failure.kind) {
          @case ('not-found') {
            <div hlmEmpty class="border">
              <div hlmEmptyHeader>
                <div hlmEmptyMedia variant="icon">
                  <ng-icon name="lucideSearchX" aria-hidden="true" />
                </div>
                <h1 hlmEmptyTitle>Atividade não encontrada</h1>
                <p hlmEmptyDescription>Ela pode ter sido removida, ou o link está incorreto.</p>
              </div>
            </div>
          }
          @case ('other') {
            <h1 class="sr-only">Atividade</h1>
            <div class="flex flex-col items-start gap-3">
              <app-error-alert
                title="Não foi possível carregar a atividade."
                [messages]="failure.messages"
              />
              <button hlmBtn variant="outline" type="button" (click)="activity.reload()">
                Tentar novamente
              </button>
            </div>
          }
        }
      } @else if (loaded(); as loaded) {
        <article hlmCard>
          <div hlmCardHeader>
            <span hlmBadge variant="secondary">{{ loaded.sport }}</span>
            <h1 hlmCardTitle class="text-2xl">{{ loaded.activity.name }}</h1>
            <p hlmCardDescription>
              <time [attr.datetime]="loaded.activity.startedAt">
                {{ loaded.activity.startedAt | date: "EEEE, d 'de' MMMM 'de' y 'às' HH:mm" }}
              </time>
            </p>
          </div>
          <div hlmCardContent>
            <dl class="grid grid-cols-2 gap-6 sm:grid-cols-3">
              @for (metric of loaded.metrics; track metric.label) {
                <div>
                  <dt class="text-muted-foreground text-sm">{{ metric.label }}</dt>
                  <dd class="text-xl font-semibold tabular-nums">{{ metric.value }}</dd>
                </div>
              }
            </dl>
          </div>
          <div hlmCardFooter class="text-muted-foreground text-xs">
            Registrada no Dutrail em
            <time class="ms-1" [attr.datetime]="loaded.activity.createdAt">
              {{ loaded.activity.createdAt | date: 'dd/MM/yyyy HH:mm' }}
            </time>
            <!-- Hoje nunca difere de createdAt (não há edição); só aparece quando houver. -->
            @if (loaded.activity.updatedAt !== loaded.activity.createdAt) {
              <span class="mx-1" aria-hidden="true">·</span>
              atualizada em
              <time class="ms-1" [attr.datetime]="loaded.activity.updatedAt">
                {{ loaded.activity.updatedAt | date: 'dd/MM/yyyy HH:mm' }}
              </time>
            }
          </div>
        </article>
      }
    </div>
  `,
})
export class ActivityDetailPage {
  private readonly activityApi = inject(ActivityApi);
  private readonly locale = inject(LOCALE_ID);
  private readonly title = inject(Title);

  /** `:id` da rota (via `withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly paths = AppPaths;
  protected readonly activity = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.activityApi.getById(id),
  });

  protected readonly failure = computed(() => {
    const error = this.activity.error();
    return error ? classifyFailure(error) : null;
  });

  protected readonly loaded = computed(() => {
    if (!this.activity.hasValue()) {
      return null;
    }
    const activity = this.activity.value();
    return { activity, sport: sportLabel(activity.sport), metrics: this.allMetrics(activity) };
  });

  constructor() {
    // O título da aba identifica a atividade aberta (WCAG 2.4.2).
    effect(() => {
      const loaded = this.loaded();
      if (loaded) {
        this.title.setTitle(`${loaded.activity.name} | Dutrail`);
      }
    });
  }

  /** Todos os campos métricos, inclusive os ausentes, que aparecem como "—". */
  private allMetrics(activity: Activity): ActivityMetric[] {
    const locale = this.locale;
    const orMissing = <T>(value: T | null, format: (value: T) => string) =>
      value === null ? '—' : format(value);
    const integer = (value: number) => formatNumber(value, locale, '1.0-0');

    return [
      {
        label: 'Distância',
        value: orMissing(activity.distanceMeters, (m) => formatDistance(m, locale)),
      },
      { label: 'Tempo em movimento', value: orMissing(activity.movingTimeSeconds, formatDuration) },
      { label: 'Tempo total', value: formatDuration(activity.elapsedTimeSeconds) },
      {
        label: 'Ganho de elevação',
        value: orMissing(activity.elevationGainMeters, (m) => formatElevation(m, locale)),
      },
      {
        label: 'FC média',
        value: orMissing(activity.averageHeartRateBpm, (bpm) => `${integer(bpm)} bpm`),
      },
      {
        label: 'FC máxima',
        value: orMissing(activity.maxHeartRateBpm, (bpm) => `${integer(bpm)} bpm`),
      },
      { label: 'Calorias', value: orMissing(activity.calories, (kcal) => `${integer(kcal)} kcal`) },
    ];
  }
}
