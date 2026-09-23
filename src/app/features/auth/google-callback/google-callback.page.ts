import { HttpStatusCode } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { describeApiError } from '../../../core/http/api-error';
import { AppPaths } from '../../../core/navigation/app-paths';
import { ErrorAlert } from '../../../shared/ui/error-alert';

/**
 * Destino do redirect da API após o login com Google:
 * `/auth/callback?code=<43 chars>`.
 *
 * O `code` não é um token. É um código de uso único, válido por 60 segundos,
 * que precisa ser trocado imediatamente em `POST /auth/google/exchange`. Só
 * nessa troca a sessão é criada (access token + cookie do refresh token).
 */
@Component({
  selector: 'app-google-callback-page',
  imports: [RouterLink, HlmButtonImports, HlmCardImports, HlmSpinnerImports, ErrorAlert],
  template: `
    <main class="flex min-h-dvh items-center justify-center p-4">
      @if (errorMessages(); as messages) {
        <section hlmCard class="w-full max-w-sm" aria-labelledby="callback-title">
          <div hlmCardHeader>
            <h1 hlmCardTitle id="callback-title">Login com Google</h1>
          </div>
          <div hlmCardContent>
            <app-error-alert title="Não foi possível entrar com o Google" [messages]="messages" />
          </div>
          <div hlmCardFooter>
            <a hlmBtn size="lg" class="w-full" [routerLink]="paths.login">Voltar para o login</a>
          </div>
        </section>
      } @else {
        <div class="flex items-center gap-2 text-sm">
          <hlm-spinner aria-label="Concluindo login com Google" />
          <p aria-hidden="true">Concluindo login com Google…</p>
        </div>
      }
    </main>
  `,
})
export class GoogleCallbackPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly paths = AppPaths;
  protected readonly errorMessages = signal<readonly string[] | null>(null);

  constructor() {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) {
      this.errorMessages.set(['O link de login está incompleto. Tente entrar novamente.']);
      return;
    }

    // Troca na hora: o código expira em 60 segundos.
    this.auth
      .exchangeGoogleCode(code)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // `replaceUrl` tira a URL com o code do histórico: voltar ou dar F5 não
        // reapresenta um código que já foi consumido.
        next: () => void this.router.navigateByUrl(AppPaths.home, { replaceUrl: true }),
        error: (error: unknown) => {
          this.clearCodeFromUrl();
          // Código já usado ou expirado (401) é esperado, por exemplo ao dar F5
          // nesta página. Não é um erro fatal, só "refaça o login".
          this.errorMessages.set(
            describeApiError(error, {
              [HttpStatusCode.Unauthorized]:
                'Este link de login expirou ou já foi usado. Entre novamente.',
              [HttpStatusCode.BadRequest]: 'O link de login é inválido. Entre novamente.',
            }),
          );
        },
      });
  }

  private clearCodeFromUrl(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }
}
