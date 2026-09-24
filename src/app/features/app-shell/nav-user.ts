import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown, lucideLogOut } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmAvatarImports } from '@spartan-ng/helm/avatar';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { AuthService } from '../../core/auth/auth.service';
import { AppPaths } from '../../core/navigation/app-paths';

/**
 * Usuário logado no rodapé da sidebar, com o menu de conta (logout).
 *
 * Os dados vêm do `AuthService`, que já os tem de `GET /me` (ou da resposta de
 * login): o guard da área logada só libera a rota depois disso.
 */
@Component({
  selector: 'ul[appNavUser]',
  imports: [NgTemplateOutlet, NgIcon, HlmAvatarImports, HlmDropdownMenuImports, HlmSidebarImports],
  providers: [provideIcons({ lucideChevronsUpDown, lucideLogOut })],
  template: `
    @if (user(); as user) {
      <li hlmSidebarMenuItem>
        <button
          hlmSidebarMenuButton
          size="lg"
          [hlmDropdownMenuTrigger]="accountMenu"
          [side]="sidebar.isMobile() ? 'bottom' : 'right'"
          align="end"
          class="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
        >
          <ng-container *ngTemplateOutlet="identity" />
          <ng-icon name="lucideChevronsUpDown" class="ms-auto" aria-hidden="true" />
          <span class="sr-only">Abrir menu da conta</span>
        </button>
      </li>

      <ng-template #identity>
        <hlm-avatar class="rounded-lg after:rounded-lg">
          @if (user.avatarUrl) {
            <!-- Avatar remoto (Google), não é imagem estática do app, então não
                 passa pelo NgOptimizedImage. no-referrer evita 403 do Google. -->
            <img
              hlmAvatarImage
              [src]="user.avatarUrl"
              alt=""
              referrerpolicy="no-referrer"
              class="rounded-lg"
            />
          }
          <!-- As cores padrão do fallback (muted) não chegam ao contraste AA. -->
          <span
            hlmAvatarFallback
            class="bg-sidebar-primary text-sidebar-primary-foreground rounded-lg"
            aria-hidden="true"
            >{{ initials() }}</span
          >
        </hlm-avatar>
        <span class="grid flex-1 text-start text-sm leading-tight">
          <span class="truncate font-medium">{{ displayName() }}</span>
          <span class="truncate text-xs">{{ user.email }}</span>
        </span>
      </ng-template>

      <ng-template #accountMenu>
        <div hlmDropdownMenu class="min-w-56">
          <!-- Repete, só visualmente, quem está logado: o botão que abre o menu já
               anuncia isso, e texto solto não é filho válido de role="menu". -->
          <div hlmDropdownMenuLabel class="flex items-center gap-2 font-normal" aria-hidden="true">
            <ng-container *ngTemplateOutlet="identity" />
          </div>
          <div hlmDropdownMenuSeparator></div>
          <button hlmDropdownMenuItem [disabled]="loggingOut()" (triggered)="logout()">
            <ng-icon name="lucideLogOut" aria-hidden="true" />
            Sair
          </button>
        </div>
      </ng-template>
    }
  `,
})
export class NavUser {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sidebar = inject(HlmSidebarService);

  protected readonly user = this.auth.currentUser;
  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.name || user?.email || '';
  });
  protected readonly initials = computed(() =>
    this.displayName()
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join(''),
  );
  protected readonly loggingOut = signal(false);

  protected logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      complete: () => void this.router.navigateByUrl(AppPaths.landing),
      error: () => {
        // O estado local já foi limpo (ver AuthService.logout). Só a revogação
        // no servidor falhou, e o usuário precisa saber disso.
        toast.error(
          'Você saiu deste dispositivo, mas o servidor não confirmou o encerramento da sessão.',
        );
        void this.router.navigateByUrl(AppPaths.landing);
      },
    });
  }
}
