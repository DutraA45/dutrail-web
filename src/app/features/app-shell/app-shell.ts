import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMountain } from '@ng-icons/lucide';
import { HlmSidebarImports, provideHlmSidebarConfig } from '@spartan-ng/helm/sidebar';
import { filter, skip } from 'rxjs';
import { AppPaths } from '../../core/navigation/app-paths';
import { NavMain } from './nav-main';
import { NavUser } from './nav-user';

/**
 * Layout da área logada (bloco "Sidebar 2" do spartan/ui): sidebar `inset` e
 * o conteúdo da rota num `main[hlmSidebarInset]`.
 *
 * `hlm-sidebar` e o `main` precisam ser irmãos diretos: o estilo inset do
 * `main` vem de seletores `peer-*` que dependem do `hlm-sidebar` logo antes
 * dele. Por isso o `hlm-sidebar` fica neste template, e só o que vai dentro
 * dele (menu, usuário) é componente separado.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, NgIcon, HlmSidebarImports, NavMain, NavUser],
  providers: [
    provideIcons({ lucideMountain }),
    // No mobile a sidebar é um sheet por cima da página; ao escolher um
    // destino, ele fecha para mostrar a tela que abriu.
    provideHlmSidebarConfig({ closeMobileSidebarOnMenuButtonClick: true }),
  ],
  template: `
    <button
      type="button"
      class="bg-background text-foreground focus-visible:ring-ring sr-only z-50 rounded-md px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus-visible:ring-2"
      (click)="focusMain()"
    >
      Pular para o conteúdo
    </button>

    <div hlmSidebarWrapper>
      <hlm-sidebar
        variant="inset"
        mobileTitle="Menu de navegação"
        mobileDescription="Navegação principal do Dutrail."
      >
        <!-- Um único landmark para toda a sidebar (marca, menu e conta), para
             nenhum conteúdo dela ficar fora de uma região navegável. -->
        <nav aria-label="Principal" class="flex min-h-0 flex-1 flex-col">
          <div hlmSidebarHeader>
            <ul hlmSidebarMenu>
              <li hlmSidebarMenuItem>
                <a hlmSidebarMenuButton size="lg" [routerLink]="paths.feed">
                  <span
                    class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                    aria-hidden="true"
                  >
                    <ng-icon name="lucideMountain" />
                  </span>
                  <span class="grid flex-1 text-start text-sm leading-tight">
                    <span class="truncate font-medium">Dutrail</span>
                    <span class="truncate text-xs">Seus treinos e trilhas</span>
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div hlmSidebarContent>
            <div hlmSidebarGroup appNavMain></div>
          </div>

          <div hlmSidebarFooter>
            <ul hlmSidebarMenu appNavUser></ul>
          </div>
        </nav>
      </hlm-sidebar>

      <main hlmSidebarInset #main tabindex="-1" class="outline-none">
        <header class="flex h-14 shrink-0 items-center gap-2 px-4">
          <button hlmSidebarTrigger class="-ms-1" srOnlyText="Alternar menu lateral"></button>
        </header>
        <div class="flex flex-1 flex-col px-4 pb-8 md:px-6">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AppShell {
  protected readonly paths = AppPaths;
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  constructor() {
    // Numa SPA o foco fica no link clicado depois da navegação; levá-lo para o
    // conteúdo faz leitores de tela anunciarem a tela nova, como numa troca
    // de página. A navegação que criou este layout ainda está em andamento
    // quando o construtor roda; ela é ignorada para não tirar o foco do lugar
    // na carga inicial.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.focusMain());
  }

  protected focusMain(): void {
    this.main().nativeElement.focus({ preventScroll: true });
  }
}
