import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppPaths } from '../navigation/app-paths';
import { AuthService } from './auth.service';

/** Telas de login e cadastro: quem já tem sessão vai direto para a área logada. */
export const guestOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureSessionChecked();

  return auth.isAuthenticated() ? router.parseUrl(AppPaths.home) : true;
};
