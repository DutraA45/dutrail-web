import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AppPaths } from '../navigation/app-paths';
import { AuthService } from './auth.service';

/**
 * Libera a área logada apenas com sessão válida; caso contrário, manda para o login.
 *
 * É um `canMatch` (e não `canActivate`) para que o código da área logada nem
 * seja baixado por quem não está autenticado.
 */
export const authenticatedGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSessionChecked();

  return auth.isAuthenticated() ? true : router.parseUrl(AppPaths.login);
};
