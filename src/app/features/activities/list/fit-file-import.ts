import { HttpStatusCode } from '@angular/common/http';
import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileUp } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { Activity } from '../../../core/activities/activity.models';
import { ActivityApi } from '../../../core/activities/activity-api';
import { describeApiError } from '../../../core/http/api-error';
import { ErrorAlert } from '../../../shared/ui/error-alert';

/**
 * Motivo para recusar o arquivo antes de enviá-lo, ou `null` se ele pode ir.
 *
 * Checa só a extensão e se o arquivo não está vazio. Validar o conteúdo (se é
 * mesmo um FIT de atividade) é papel da API, que é quem o interpreta.
 */
export function validateFitFile(file: Pick<File, 'name' | 'size'>): string | null {
  if (!file.name.toLowerCase().endsWith('.fit')) {
    return 'Selecione um arquivo com extensão .fit.';
  }
  if (file.size === 0) {
    return 'O arquivo selecionado está vazio.';
  }
  return null;
}

/**
 * Botão de importação de atividade a partir de um arquivo `.fit`.
 *
 * TODO(api): a rota `POST /activities/import` ainda não existe na API (ver
 * `ActivityApi.importFitFile`). A interface já está completa (seleção,
 * validação, loading e erro); até o endpoint existir, o envio termina no erro
 * de "importação indisponível" abaixo, sem afetar o resto da tela.
 */
@Component({
  selector: 'app-fit-file-import',
  imports: [NgIcon, HlmButtonImports, HlmSpinnerImports, ErrorAlert],
  providers: [provideIcons({ lucideFileUp })],
  host: { class: 'flex flex-col items-start gap-3 sm:items-end' },
  template: `
    <!-- O input fica escondido e o botão abre o seletor: mantém o visual do
           spartan/ui e um único alvo de foco. -->
    <input
      #fileInput
      type="file"
      accept=".fit"
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      (change)="onFileSelected($event)"
    />
    <button hlmBtn type="button" [disabled]="importing()" (click)="fileInput.click()">
      @if (importing()) {
        <hlm-spinner aria-hidden="true" />
        Importando…
      } @else {
        <ng-icon name="lucideFileUp" aria-hidden="true" />
        Importar arquivo .fit
      }
    </button>
    <p class="sr-only" aria-live="polite">
      {{ importing() ? 'Importando ' + fileName() : '' }}
    </p>
    @if (errorMessages(); as messages) {
      <app-error-alert
        class="block w-full max-w-md"
        title="Não foi possível importar."
        [messages]="messages"
      />
    }
  `,
})
export class FitFileImport {
  private readonly activityApi = inject(ActivityApi);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** Emitida com a atividade criada quando a importação dá certo. */
  readonly imported = output<Activity>();

  protected readonly importing = signal(false);
  protected readonly fileName = signal('');
  protected readonly errorMessages = signal<readonly string[] | null>(null);

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    // Limpa o input para que escolher o mesmo arquivo de novo (ex. depois de
    // um erro) volte a disparar o `change`.
    this.fileInput().nativeElement.value = '';
    if (!file) {
      return;
    }

    const invalidReason = validateFitFile(file);
    if (invalidReason) {
      this.errorMessages.set([invalidReason]);
      return;
    }

    this.errorMessages.set(null);
    this.fileName.set(file.name);
    this.importing.set(true);
    this.activityApi.importFitFile(file).subscribe({
      next: (activity) => {
        this.importing.set(false);
        this.imported.emit(activity);
      },
      error: (error: unknown) => {
        this.importing.set(false);
        this.errorMessages.set(
          describeApiError(error, {
            // Enquanto a API não tiver a rota de importação, o POST cai em 404.
            // Depois que ela existir, este caso deixa de acontecer.
            [HttpStatusCode.NotFound]:
              'A importação de arquivos .fit ainda não está disponível no servidor.',
            [HttpStatusCode.Conflict]: 'Esta atividade já foi importada.',
            [HttpStatusCode.PayloadTooLarge]: 'O arquivo é grande demais para ser importado.',
          }),
        );
      },
    });
  }
}
