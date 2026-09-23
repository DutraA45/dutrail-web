import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import { HlmAlertImports } from '@spartan-ng/helm/alert';

/**
 * Alerta de erro padrão das telas (sobre o `hlm-alert` do spartan/ui).
 *
 * Recebe mensagens já prontas para o usuário. Traduzir erros da API é
 * responsabilidade do `core` (`describeApiError`), não deste componente.
 * `role="alert"` (vindo do `hlmAlert`) faz leitores de tela anunciarem o erro
 * assim que ele aparece.
 */
@Component({
  selector: 'app-error-alert',
  imports: [HlmAlertImports, NgIcon],
  providers: [provideIcons({ lucideCircleAlert })],
  template: `
    <div hlmAlert variant="destructive">
      <ng-icon name="lucideCircleAlert" aria-hidden="true" />
      <p hlmAlertTitle>{{ title() }}</p>
      <div hlmAlertDescription>
        @if (messages().length === 1) {
          <p>{{ messages()[0] }}</p>
        } @else {
          <ul class="list-disc ps-4">
            @for (message of messages(); track $index) {
              <li>{{ message }}</li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class ErrorAlert {
  readonly title = input.required<string>();
  readonly messages = input.required<readonly string[]>();
}
