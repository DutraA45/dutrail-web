import { HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  email,
  FieldTree,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  ValidationError,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { SignupRequest } from '../../../core/auth/auth.models';
import { describeApiError, httpStatusOf } from '../../../core/http/api-error';
import { AppPaths } from '../../../core/navigation/app-paths';
import { ErrorAlert } from '../../../shared/ui/error-alert';
import { GoogleSignInButton } from '../components/google-sign-in-button';

/** Estado do formulário. `name` é string vazia no form, mas opcional na API. */
interface SignupFormModel {
  name: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-signup-page',
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
  templateUrl: './signup.page.html',
})
export class SignupPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly paths = AppPaths;
  protected readonly apiError = signal<readonly string[] | null>(null);

  private readonly model = signal<SignupFormModel>({ name: '', email: '', password: '' });

  // As regras espelham a validação da API (nome ≤ 100, senha entre 8 e 128).
  // O 400 vira exceção, não o caminho normal de erro.
  protected readonly signupForm = form(
    this.model,
    (field) => {
      maxLength(field.name, 100, { message: 'O nome tem no máximo 100 caracteres.' });
      required(field.email, { message: 'Informe seu email.' });
      email(field.email, { message: 'Informe um email válido.' });
      required(field.password, { message: 'Crie uma senha.' });
      minLength(field.password, 8, { message: 'A senha precisa ter pelo menos 8 caracteres.' });
      maxLength(field.password, 128, { message: 'A senha tem no máximo 128 caracteres.' });
    },
    { submission: { action: (fieldTree) => this.submit(fieldTree) } },
  );

  private async submit(
    fieldTree: FieldTree<SignupFormModel>,
  ): Promise<ValidationError.WithOptionalFieldTree | undefined> {
    this.apiError.set(null);
    try {
      await firstValueFrom(this.auth.signup(this.toSignupRequest(this.model())));
      await this.router.navigateByUrl(AppPaths.home);
      return undefined;
    } catch (error) {
      // Email já cadastrado é um problema do campo, não do formulário: o erro
      // aparece embaixo do email e some sozinho quando o valor muda.
      if (httpStatusOf(error) === HttpStatusCode.Conflict) {
        return {
          kind: 'emailTaken',
          message: 'Este email já está em uso. Entre com ele ou use outro.',
          fieldTree: fieldTree.email,
        };
      }
      this.apiError.set(describeApiError(error));
      return undefined;
    }
  }

  /**
   * A API rejeita campos desconhecidos e aceitaria `name: ""` como nome
   * válido. Por isso o nome só vai no corpo quando foi preenchido.
   */
  private toSignupRequest({ name, email, password }: SignupFormModel): SignupRequest {
    const trimmedName = name.trim();
    return trimmedName ? { email, password, name: trimmedName } : { email, password };
  }
}
