import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideConstruction } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { AppPaths } from '../../core/navigation/app-paths';

/**
 * Página única para as telas planejadas que ainda não existem.
 *
 * Existe para que os itens da sidebar já apontem para as rotas definitivas
 * sem quebrar a navegação. Quando uma tela for construída, basta trocar o
 * `loadComponent` da rota dela em `app.routes.ts`.
 */
@Component({
  selector: 'app-coming-soon-page',
  imports: [RouterLink, NgIcon, HlmButtonImports, HlmEmptyImports],
  providers: [provideIcons({ lucideConstruction })],
  template: `
    <div hlmEmpty class="flex-1">
      <div hlmEmptyHeader>
        <div hlmEmptyMedia variant="icon">
          <ng-icon name="lucideConstruction" aria-hidden="true" />
        </div>
        <h1 hlmEmptyTitle>{{ feature() }}</h1>
        <p hlmEmptyDescription>Esta área ainda está em construção.</p>
      </div>
      <div hlmEmptyContent>
        <a hlmBtn variant="outline" [routerLink]="paths.feed">Voltar para o início</a>
      </div>
    </div>
  `,
})
export class ComingSoonPage {
  /** Nome da tela, vindo do `data` da rota. */
  readonly feature = input.required<string>();

  protected readonly paths = AppPaths;
}
