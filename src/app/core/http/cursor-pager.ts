import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, DestroyRef, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { isApiErrorBody } from './api-error';

/** Página de uma listagem paginada por cursor da API. */
export interface CursorPage<T> {
  items: T[];
  /** `null` = fim da lista. */
  nextCursor: string | null;
}

/** Busca uma página; `cursor` é `null` na primeira. */
export type FetchCursorPage<T> = (cursor: string | null) => Observable<CursorPage<T>>;

/**
 * 400 `"Invalid cursor"`: o cursor foi adulterado, truncado ou deixou de valer.
 * O único jeito de seguir é recomeçar a lista do início (sem cursor).
 */
export function isInvalidCursorError(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === HttpStatusCode.BadRequest &&
    isApiErrorBody(error.error) &&
    error.error.message === 'Invalid cursor'
  );
}

type PagerStatus = 'loading' | 'ready' | 'loading-more' | 'error';

interface PagerState<T> {
  items: T[];
  nextCursor: string | null;
  status: PagerStatus;
  /** Falha da primeira página: a lista não tem o que mostrar. */
  error: unknown;
  /** Falha ao buscar mais: os itens já carregados continuam na tela. */
  loadMoreError: unknown;
}

/**
 * Estado de uma listagem paginada por cursor, com "carregar mais".
 *
 * O cursor é opaco: vem da API em `nextCursor` e volta para ela sem ser lido
 * nem montado aqui. As páginas chegam em ordem e sem sobreposição (é para isso
 * que a API usa cursor e não offset), então os itens só são concatenados.
 *
 * Use `injectCursorPager`, que já busca a primeira página e cancela a request
 * em andamento quando o componente é destruído.
 */
export class CursorPager<T> {
  private readonly state = signal<PagerState<T>>({
    items: [],
    nextCursor: null,
    status: 'loading',
    error: null,
    loadMoreError: null,
  });
  private request: Subscription | null = null;

  readonly items = computed(() => this.state().items);
  /** Primeira página em andamento (inclusive ao recarregar). */
  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly isLoadingMore = computed(() => this.state().status === 'loading-more');
  readonly hasMore = computed(() => this.state().nextCursor !== null);
  readonly error = computed(() => this.state().error);
  readonly loadMoreError = computed(() => this.state().loadMoreError);

  constructor(private readonly fetchPage: FetchCursorPage<T>) {}

  /** Busca a lista do início, descartando o que já estava carregado. */
  reload(): void {
    this.request?.unsubscribe();
    this.state.update((state) => ({
      ...state,
      status: 'loading',
      error: null,
      loadMoreError: null,
    }));
    this.request = this.fetchPage(null).subscribe({
      next: ({ items, nextCursor }) =>
        this.state.set({ items, nextCursor, status: 'ready', error: null, loadMoreError: null }),
      error: (error: unknown) =>
        this.state.set({
          items: [],
          nextCursor: null,
          status: 'error',
          error,
          loadMoreError: null,
        }),
    });
  }

  /** Busca a próxima página e a acrescenta ao fim. Não faz nada se não houver mais. */
  loadMore(): void {
    const { nextCursor, status } = this.state();
    if (nextCursor === null || status !== 'ready') {
      return;
    }

    this.state.update((state) => ({ ...state, status: 'loading-more', loadMoreError: null }));
    this.request = this.fetchPage(nextCursor).subscribe({
      next: (page) =>
        this.state.update((state) => ({
          ...state,
          items: [...state.items, ...page.items],
          nextCursor: page.nextCursor,
          status: 'ready',
        })),
      error: (error: unknown) => {
        if (isInvalidCursorError(error)) {
          // Cursor recusado não tem conserto do lado do cliente: recomeçar do
          // topo é o que a API orienta e evita deixar a tela presa num erro.
          this.reload();
          return;
        }
        this.state.update((state) => ({ ...state, status: 'ready', loadMoreError: error }));
      },
    });
  }

  destroy(): void {
    this.request?.unsubscribe();
  }
}

/** Cria o paginador já buscando a primeira página, preso ao ciclo de vida de quem injeta. */
export function injectCursorPager<T>(fetchPage: FetchCursorPage<T>): CursorPager<T> {
  const pager = new CursorPager(fetchPage);
  inject(DestroyRef).onDestroy(() => pager.destroy());
  pager.reload();
  return pager;
}
