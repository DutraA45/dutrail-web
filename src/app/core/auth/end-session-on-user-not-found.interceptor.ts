import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_BASE_URL, apiPathOf } from '../http/api-base-url';
import { httpStatusOf } from '../http/api-error';
import { AppPaths } from '../navigation/app-paths';
import { AuthService } from './auth.service';

/**
 * Rotas em que um 404 `User not found` significa que o usuário foi apagado com
 * o access token ainda válido. Comparadas pelo método e pelo caminho exato.
 */
const USER_NOT_FOUND_ROUTES: readonly { method: string; path: string }[] = [
  { method: 'GET', path: '/me' },
  { method: 'POST', path: '/activities/import' },
];

/**
 * Um 404 em `GET /me` ou `POST /activities/import` é **sessão encerrada**: o
 * usuário não existe mais. Limpa a sessão local e manda para o login, sem
 * mensagem (a tela não deve mostrar um "não encontrado" genérico).
 *
 * Qualquer outro 404 passa intacto. Em especial o de `GET /activities/:id`,
 * que é só uma atividade inexistente ou de outra pessoa.
 *
 * Não tenta refresh nem repete nada: só observa a resposta e repassa o erro.
 * Deve ser registrado **antes** do `refreshOnUnauthorizedInterceptor`, para ver
 * também o 404 de uma request repetida depois de um refresh.
 */
export const endSessionOnUserNotFoundInterceptor: HttpInterceptorFn = (req, next) => {
  const path = apiPathOf(req.url, inject(API_BASE_URL));
  const endsSessionOn404 = USER_NOT_FOUND_ROUTES.some(
    (route) => route.method === req.method && route.path === path,
  );
  if (!endsSessionOn404) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        if (httpStatusOf(error) === HttpStatusCode.NotFound) {
          auth.clearLocalSession();
          void router.navigateByUrl(AppPaths.login);
        }
      },
    }),
  );
};
