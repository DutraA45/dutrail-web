import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { refreshOnUnauthorizedInterceptor } from './core/auth/refresh-on-unauthorized.interceptor';
import { apiRequestHeadersInterceptor } from './core/http/api-request-headers.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      // A ordem importa: o interceptor de refresh envolve o de headers. Assim,
      // quando ele repete uma request após renovar a sessão, a repetição passa
      // de novo pelo de headers e sai com o access token novo.
      withInterceptors([refreshOnUnauthorizedInterceptor, apiRequestHeadersInterceptor]),
    ),
    provideSpartanHlm(),
  ],
};
