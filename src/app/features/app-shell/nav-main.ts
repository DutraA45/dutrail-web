import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight } from '@ng-icons/lucide';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { filter, map } from 'rxjs';
import { NAV_SECTIONS, navIcons, NavSection } from './nav-items';

/**
 * Menu principal da sidebar: seções com ícone e, quando há, submenu recolhível.
 *
 * O destaque do item ativo vem do `routerLinkActive`. Já a abertura dos
 * submenus acompanha a URL: a seção da rota atual abre sozinha (ex. ao entrar
 * direto no detalhe de uma atividade), e o usuário pode abrir/fechar as demais.
 */
@Component({
  selector: 'div[appNavMain]',
  imports: [RouterLink, RouterLinkActive, NgIcon, HlmSidebarImports, HlmCollapsibleImports],
  providers: [provideIcons({ ...navIcons, lucideChevronRight })],
  template: `
    <div hlmSidebarGroupLabel id="nav-main-label">Plataforma</div>
    <ul hlmSidebarMenu aria-labelledby="nav-main-label">
      @for (section of sections; track section.label) {
        <li
          hlmSidebarMenuItem
          hlmCollapsible
          [expanded]="isSectionActive(section)"
          class="group/collapsible"
        >
          @if (section.path) {
            <a
              hlmSidebarMenuButton
              [routerLink]="section.path"
              routerLinkActive
              #sectionLink="routerLinkActive"
              [ariaCurrentWhenActive]="section.children ? true : 'page'"
              [isActive]="sectionLink.isActive"
            >
              <ng-icon [name]="section.icon" aria-hidden="true" />
              <span>{{ section.label }}</span>
            </a>
            @if (section.children) {
              <button
                hlmSidebarMenuAction
                hlmCollapsibleTrigger
                class="data-[state=open]:rotate-90"
                [attr.aria-label]="'Submenu de ' + section.label"
              >
                <ng-icon name="lucideChevronRight" aria-hidden="true" />
              </button>
            }
          } @else {
            <!-- Seção sem página própria: o botão só abre/fecha o submenu, então
                 não deve fechar a sidebar no mobile. -->
            <button
              hlmSidebarMenuButton
              hlmCollapsibleTrigger
              [closeMobileSidebarOnClick]="false"
              [isActive]="isSectionActive(section)"
            >
              <ng-icon [name]="section.icon" aria-hidden="true" />
              <span>{{ section.label }}</span>
              <ng-icon
                name="lucideChevronRight"
                aria-hidden="true"
                class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
              />
            </button>
          }

          @if (section.children) {
            <div hlmCollapsibleContent>
              <ul hlmSidebarMenuSub>
                @for (child of section.children; track child.path) {
                  <li hlmSidebarMenuSubItem>
                    <a
                      hlmSidebarMenuSubButton
                      [routerLink]="child.path"
                      routerLinkActive
                      #childLink="routerLinkActive"
                      [routerLinkActiveOptions]="{ exact: child.exact ?? false }"
                      ariaCurrentWhenActive="page"
                      [isActive]="childLink.isActive"
                    >
                      <span>{{ child.label }}</span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        </li>
      }
    </ul>
  `,
})
export class NavMain {
  private readonly router = inject(Router);

  protected readonly sections = NAV_SECTIONS;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly activePrefixes = computed(() => {
    const url = this.url().split(/[?#]/)[0];
    return new Set(
      this.sections
        .map((section) => section.activePrefix)
        .filter((prefix) => prefix !== undefined)
        .filter((prefix) => url === prefix || url.startsWith(`${prefix}/`)),
    );
  });

  protected isSectionActive(section: NavSection): boolean {
    return section.activePrefix !== undefined && this.activePrefixes().has(section.activePrefix);
  }
}
