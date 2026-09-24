import { Component, input, output } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { ErrorAlert } from './error-alert';

/**
 * Rodapé de listas paginadas: botão "Carregar mais", erro da última tentativa
 * e um aviso para leitores de tela de quantos itens a lista tem.
 *
 * Durante o carregamento o botão fica com `aria-disabled` (e não `disabled`):
 * desabilitar de verdade tiraria o foco do botão que o usuário acabou de
 * acionar. Ignorar cliques repetidos é papel de quem trata o `loadMore`.
 */
@Component({
  selector: 'app-load-more',
  imports: [HlmButtonImports, HlmSpinnerImports, ErrorAlert],
  host: { class: 'flex flex-col items-center gap-3' },
  template: `
    @if (errorMessages(); as messages) {
      <app-error-alert title="Não foi possível carregar mais." [messages]="messages" />
    }
    @if (hasMore()) {
      <button
        hlmBtn
        variant="outline"
        type="button"
        [attr.aria-disabled]="loading() || null"
        (click)="loadMore.emit()"
      >
        @if (loading()) {
          <hlm-spinner aria-hidden="true" />
          Carregando…
        } @else {
          {{ errorMessages() ? 'Tentar novamente' : 'Carregar mais' }}
        }
      </button>
    }
    <p class="sr-only" aria-live="polite">{{ loadedLabel() }}</p>
  `,
})
export class LoadMore {
  readonly hasMore = input.required<boolean>();
  readonly loading = input.required<boolean>();
  readonly errorMessages = input<readonly string[] | null>(null);
  /** Anunciado quando muda, ex. "20 atividades carregadas". */
  readonly loadedLabel = input('');

  readonly loadMore = output<void>();
}
