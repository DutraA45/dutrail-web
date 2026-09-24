import { DatePipe } from '@angular/common';
import { Component, computed, inject, LOCALE_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  sportLabel,
} from '../../../core/activities/activity-format';
import { Activity } from '../../../core/activities/activity.models';
import { ActivityApi } from '../../../core/activities/activity-api';
import { describeApiError } from '../../../core/http/api-error';
import { injectCursorPager } from '../../../core/http/cursor-pager';
import { AppPaths } from '../../../core/navigation/app-paths';
import { ErrorAlert } from '../../../shared/ui/error-alert';
import { LoadMore } from '../../../shared/ui/load-more';
import { FitFileImport } from './fit-file-import';

/** Lista (tabela) de todas as atividades do usuário, com importação de `.fit`. */
@Component({
  selector: 'app-activity-list-page',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmEmptyImports,
    HlmSkeletonImports,
    HlmTableImports,
    ErrorAlert,
    LoadMore,
    FitFileImport,
  ],
  providers: [provideIcons({ lucideActivity })],
  template: `
    <div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Atividades</h1>
          <p class="text-muted-foreground text-sm">Todas as suas atividades registradas.</p>
        </div>
        <app-fit-file-import (imported)="onImported($event)" />
      </header>

      @if (activities.isLoading()) {
        <div class="flex flex-col gap-2" role="status">
          <span class="sr-only">Carregando atividades…</span>
          @for (placeholder of [1, 2, 3, 4, 5]; track placeholder) {
            <hlm-skeleton class="h-10 w-full" aria-hidden="true" />
          }
        </div>
      } @else if (errorMessages(); as messages) {
        <div class="flex flex-col items-start gap-3">
          <app-error-alert
            title="Não foi possível carregar suas atividades."
            [messages]="messages"
          />
          <button hlmBtn variant="outline" type="button" (click)="activities.reload()">
            Tentar novamente
          </button>
        </div>
      } @else if (rows().length === 0) {
        <div hlmEmpty class="border">
          <div hlmEmptyHeader>
            <div hlmEmptyMedia variant="icon">
              <ng-icon name="lucideActivity" aria-hidden="true" />
            </div>
            <h2 hlmEmptyTitle>Nenhuma atividade registrada</h2>
            <p hlmEmptyDescription>
              Use "Importar arquivo .fit" para trazer uma atividade do seu dispositivo.
            </p>
          </div>
        </div>
      } @else {
        <div hlmTableContainer class="rounded-lg border">
          <table hlmTable>
            <caption class="sr-only">
              Suas atividades, da mais recente para a mais antiga
            </caption>
            <thead hlmTHead>
              <tr hlmTr>
                <th hlmTh scope="col">Nome</th>
                <th hlmTh scope="col">Modalidade</th>
                <th hlmTh scope="col">Data</th>
                <th hlmTh scope="col" class="text-end">Distância</th>
                <th hlmTh scope="col" class="text-end">Duração</th>
                <th hlmTh scope="col" class="text-end">Elevação</th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @for (row of rows(); track row.id) {
                <tr hlmTr>
                  <td hlmTd class="font-medium">
                    <a
                      [routerLink]="row.detailPath"
                      class="focus-visible:ring-ring rounded-sm hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {{ row.name }}
                    </a>
                  </td>
                  <td hlmTd>{{ row.sport }}</td>
                  <td hlmTd>
                    <time [attr.datetime]="row.startedAt">
                      {{ row.startedAt | date: 'dd/MM/yyyy HH:mm' }}
                    </time>
                  </td>
                  <td hlmTd class="text-end tabular-nums">{{ row.distance }}</td>
                  <td hlmTd class="text-end tabular-nums">{{ row.duration }}</td>
                  <td hlmTd class="text-end tabular-nums">{{ row.elevation }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-load-more
          [hasMore]="activities.hasMore()"
          [loading]="activities.isLoadingMore()"
          [errorMessages]="loadMoreErrorMessages()"
          [loadedLabel]="rows().length + ' atividades carregadas'"
          (loadMore)="activities.loadMore()"
        />
      }
    </div>
  `,
})
export class ActivityListPage {
  private readonly activityApi = inject(ActivityApi);
  private readonly locale = inject(LOCALE_ID);

  // Páginas maiores que as do feed: numa tabela cabem mais linhas por tela.
  protected readonly activities = injectCursorPager((cursor) =>
    this.activityApi.listMine({ cursor, limit: 50 }),
  );

  // A API já entrega em ordem (mais recente primeiro) e sem repetir itens entre páginas.
  protected readonly rows = computed(() =>
    this.activities.items().map((activity) => this.toRow(activity)),
  );
  protected readonly errorMessages = computed(() => {
    const error = this.activities.error();
    return error ? describeApiError(error) : null;
  });
  protected readonly loadMoreErrorMessages = computed(() => {
    const error = this.activities.loadMoreError();
    return error ? describeApiError(error) : null;
  });

  protected onImported(activity: Activity): void {
    toast.success(`Atividade "${activity.name}" importada.`);
    this.activities.reload();
  }

  private toRow(activity: Activity) {
    const missing = '—';
    return {
      id: activity.id,
      name: activity.name,
      detailPath: AppPaths.activityDetail(activity.id),
      sport: sportLabel(activity.sport),
      startedAt: activity.startedAt,
      distance:
        activity.distanceMeters === null
          ? missing
          : formatDistance(activity.distanceMeters, this.locale),
      duration: formatDuration(activity.movingTimeSeconds ?? activity.elapsedTimeSeconds),
      elevation:
        activity.elevationGainMeters === null
          ? missing
          : formatElevation(activity.elevationGainMeters, this.locale),
    };
  }
}
