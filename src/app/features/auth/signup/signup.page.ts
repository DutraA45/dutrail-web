import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  email,
  FieldTree,
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  pattern,
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
import { describeApiError, httpStatusOf, isApiErrorBody } from '../../../core/http/api-error';
import { AppPaths } from '../../../core/navigation/app-paths';
import { ErrorAlert } from '../../../shared/ui/error-alert';
import { GoogleSignInButton } from '../components/google-sign-in-button';

/**
 * Exige um domínio com ponto (`ana@empresa.com`). O validador `email` do
 * Angular aceita `ana@empresa`, que a API recusa com 400.
 */
const EMAIL_WITH_DOTTED_DOMAIN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INVALID_EMAIL_MESSAGE = 'Informe um email válido.';
const REJECTED_PASSWORD_MESSAGE =
  'Escolha outra senha: esta é fraca ou já apareceu em vazamentos de dados.';
const GENERIC_BAD_REQUEST_MESSAGE =
  'Não foi possível concluir o cadastro. Confira os dados e tente de novo.';

/** Texto do `message` de um erro da API (string ou lista), em minúsculas. */
function apiMessageText(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || !isApiErrorBody(error.error)) {
    return '';
  }
  const { message } = error.error;
  return (Array.isArray(message) ? message.join(' ') : message).toLowerCase();
}

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
      email(field.email, { message: INVALID_EMAIL_MESSAGE });
      pattern(field.email, EMAIL_WITH_DOTTED_DOMAIN, { message: INVALID_EMAIL_MESSAGE });
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
      if (httpStatusOf(error) === HttpStatusCode.BadRequest) {
        return this.describeBadRequest(error, fieldTree);
      }
      this.apiError.set(describeApiError(error));
      return undefined;
    }
  }

  /**
   * O texto do 400 vem em inglês e por campo (`["email must be an email"]`,
   * `["password has appeared in a known data breach; ..."]`), então vira uma
   * mensagem própria: email no campo de email, senha no alerta do formulário,
   * e um texto genérico para o resto.
   */
  private describeBadRequest(
    error: unknown,
    fieldTree: FieldTree<SignupFormModel>,
  ): ValidationError.WithOptionalFieldTree | undefined {
    const text = apiMessageText(error);
    const mentionsEmail = text.includes('email');
    const mentionsPassword = text.includes('password');

    if (mentionsPassword) {
      this.apiError.set([REJECTED_PASSWORD_MESSAGE]);
    } else if (!mentionsEmail) {
      this.apiError.set([GENERIC_BAD_REQUEST_MESSAGE]);
    }
    return mentionsEmail
      ? { kind: 'emailRejected', message: INVALID_EMAIL_MESSAGE, fieldTree: fieldTree.email }
      : undefined;
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
