import { Component, inject } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { AuthService } from '../../../core/auth/auth.service';

/** Botão "Entrar com Google", compartilhado pelas telas de login e cadastro. */
@Component({
  selector: 'app-google-sign-in-button',
  imports: [HlmButtonImports],
  template: `
    <button hlmBtn variant="outline" size="lg" type="button" class="w-full" (click)="signIn()">
      Entrar com Google
    </button>
  `,
})
export class GoogleSignInButton {
  private readonly auth = inject(AuthService);

  protected signIn(): void {
    this.auth.startGoogleSignIn();
  }
}
