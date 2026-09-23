import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AppPaths } from '../../core/navigation/app-paths';

/** Página pública de entrada. */
@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, HlmButtonImports],
  template: `
    <main class="flex min-h-dvh flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 class="text-4xl font-bold tracking-tight">Dutrail</h1>
      <div class="flex gap-3">
        <a hlmBtn size="lg" [routerLink]="paths.login">Entrar</a>
        <a hlmBtn size="lg" variant="outline" [routerLink]="paths.signup">Criar conta</a>
      </div>
    </main>
  `,
})
export class LandingPage {
  protected readonly paths = AppPaths;
}
