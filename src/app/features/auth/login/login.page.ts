import { HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginRequest } from '../../../core/auth/auth.models';
import { describeApiError } from '../../../core/http/api-error';
import { AppPaths } from '../../../core/navigation/app-paths';
import { ErrorAlert } from '../../../shared/ui/error-alert';
import { GoogleSignInButton } from '../components/google-sign-in-button';

@Component({
  selector: 'app-login-page',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputImports,
    HlmSpinnerImports,
    ErrorAlert,
    GoogleSignInButton,
  ],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly paths = AppPaths;
  protected readonly apiError = signal<readonly string[] | null>(null);

  private readonly credentials = signal<LoginRequest>({ email: '', password: '' });

  protected readonly loginForm = form(
    this.credentials,
    (field) => {
      required(field.email, { message: 'Informe seu email.' });
      email(field.email, { message: 'Informe um email válido.' });
      required(field.password, { message: 'Informe sua senha.' });
      maxLength(field.password, 128, { message: 'A senha tem no máximo 128 caracteres.' });
    },
    { submission: { action: () => this.submit() } },
  );

  private async submit(): Promise<void> {
    this.apiError.set(null);
    try {
      await firstValueFrom(this.auth.login(this.credentials()));
      await this.router.navigateByUrl(AppPaths.home);
    } catch (error) {
      this.apiError.set(
        describeApiError(error, {
          // A API devolve o mesmo 401 para senha errada, email inexistente e
          // conta criada só com Google (para não revelar quais emails existem).
          [HttpStatusCode.Unauthorized]:
            'Email ou senha inválidos. Se você criou a conta com o Google, use o botão "Entrar com Google".',
        }),
      );
    }
  }
}
