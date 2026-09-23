import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../../core/auth/auth.service';
import { AppPaths } from '../../core/navigation/app-paths';

/** Página inicial da área logada (placeholder por enquanto). */
@Component({
  selector: 'app-dashboard-home-page',
  imports: [HlmButtonImports, HlmCardImports, HlmSpinnerImports],
  template: `
    <main class="flex min-h-dvh items-center justify-center p-4">
      @if (user(); as user) {
        <section hlmCard class="w-full max-w-sm" aria-labelledby="dashboard-title">
          <div hlmCardHeader>
            <h1 hlmCardTitle id="dashboard-title">Olá, {{ displayName() }}</h1>
            <p hlmCardDescription>Você está autenticado.</p>
          </div>
          <div hlmCardContent>
            <dl class="grid gap-1 text-sm">
              <dt class="text-muted-foreground">Email</dt>
              <dd class="font-medium">{{ user.email }}</dd>
            </dl>
          </div>
          <div hlmCardFooter>
            <button
              hlmBtn
              variant="outline"
              size="lg"
              type="button"
              class="w-full"
              [disabled]="loggingOut()"
              (click)="logout()"
            >
              @if (loggingOut()) {
                <hlm-spinner aria-label="Saindo" />
              }
              Sair
            </button>
          </div>
        </section>
      }
    </main>
  `,
})
export class DashboardHomePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // O guard só libera esta rota com sessão restaurada, então o usuário já
  // está carregado aqui (veio do login, do exchange do Google ou de GET /me).
  protected readonly user = this.auth.currentUser;
  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.name || user?.email || '';
  });
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
