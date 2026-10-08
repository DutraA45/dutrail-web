import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { routes } from './app.routes';
import { endSessionOnUserNotFoundInterceptor } from './core/auth/end-session-on-user-not-found.interceptor';
import { refreshOnUnauthorizedInterceptor } from './core/auth/refresh-on-unauthorized.interceptor';
import { apiRequestHeadersInterceptor } from './core/http/api-request-headers.interceptor';

// Datas e números (DatePipe, formatNumber) no formato brasileiro, como o resto da UI.
registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Parâmetros de rota (ex. `:id`) chegam nas páginas como `input()`.
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      // A ordem importa: o interceptor de refresh envolve o de headers. Assim,
      // quando ele repete uma request após renovar a sessão, a repetição passa
      // de novo pelo de headers e sai com o access token novo. O de 404 (usuário
      // apagado) fica por fora de todos, para ver também a resposta repetida.
      withInterceptors([
        endSessionOnUserNotFoundInterceptor,
        refreshOnUnauthorizedInterceptor,
        apiRequestHeadersInterceptor,
      ]),
    ),
    provideSpartanHlm(),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
