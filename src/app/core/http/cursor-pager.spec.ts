import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { CursorPage, CursorPager } from './cursor-pager';

function apiError(status: number, message: string | string[]): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: {
      statusCode: status,
      error: 'Bad Request',
      message,
      path: '/activities',
      timestamp: '',
    },
  });
}

describe('CursorPager', () => {
  let requests: { cursor: string | null; response: Subject<CursorPage<string>> }[];
  let pager: CursorPager<string>;

  /** Responde a request mais recente. */
  function respond(page: CursorPage<string>): void {
    const { response } = requests[requests.length - 1];
    response.next(page);
    response.complete();
  }

  function fail(error: unknown): void {
    requests[requests.length - 1].response.error(error);
  }

  beforeEach(() => {
    requests = [];
    pager = new CursorPager((cursor) => {
      const response = new Subject<CursorPage<string>>();
      requests.push({ cursor, response });
      return response;
    });
    pager.reload();
  });

  it('loads the first page without a cursor', () => {
    expect(pager.isLoading()).toBe(true);
    expect(requests.map((r) => r.cursor)).toEqual([null]);

    respond({ items: ['a', 'b'], nextCursor: 'c1' });

    expect(pager.isLoading()).toBe(false);
    expect(pager.items()).toEqual(['a', 'b']);
    expect(pager.hasMore()).toBe(true);
  });

  it('appends the next pages passing nextCursor back untouched, until it is null', () => {
    respond({ items: ['a', 'b'], nextCursor: 'opaque/+==' });

    pager.loadMore();
    expect(pager.isLoadingMore()).toBe(true);
    respond({ items: ['c'], nextCursor: null });

    expect(requests.map((r) => r.cursor)).toEqual([null, 'opaque/+==']);
    expect(pager.items()).toEqual(['a', 'b', 'c']);
    expect(pager.hasMore()).toBe(false);

    pager.loadMore();
    expect(requests).toHaveLength(2);
  });

  it('ignores loadMore while a page is already on its way', () => {
    respond({ items: ['a'], nextCursor: 'c1' });

    pager.loadMore();
    pager.loadMore();

    expect(requests.map((r) => r.cursor)).toEqual([null, 'c1']);
  });

  it('starts over from the first page when the API rejects the cursor', () => {
    respond({ items: ['a', 'b'], nextCursor: 'tampered' });

    pager.loadMore();
    fail(apiError(400, 'Invalid cursor'));

    expect(requests.map((r) => r.cursor)).toEqual([null, 'tampered', null]);
    expect(pager.isLoading()).toBe(true);
    expect(pager.loadMoreError()).toBeNull();

    respond({ items: ['z', 'a'], nextCursor: 'fresh' });
    expect(pager.items()).toEqual(['z', 'a']);
    expect(pager.error()).toBeNull();
    expect(pager.hasMore()).toBe(true);
  });

  it('keeps the loaded items and allows retrying when loading more fails for another reason', () => {
    respond({ items: ['a'], nextCursor: 'c1' });

    pager.loadMore();
    const networkError = new HttpErrorResponse({ status: 0 });
    fail(networkError);

    expect(pager.items()).toEqual(['a']);
    expect(pager.loadMoreError()).toBe(networkError);
    expect(pager.hasMore()).toBe(true);

    pager.loadMore();
    expect(requests.map((r) => r.cursor)).toEqual([null, 'c1', 'c1']);
  });

  it('does not treat validation 400s as an invalid cursor', () => {
    respond({ items: ['a'], nextCursor: 'c1' });

    pager.loadMore();
    fail(apiError(400, ['limit must not be greater than 100']));

    expect(requests).toHaveLength(2);
    expect(pager.items()).toEqual(['a']);
    expect(pager.loadMoreError()).toBeInstanceOf(HttpErrorResponse);
  });

  it('exposes a first-page failure as error, with nothing to show', () => {
    const serverError = new HttpErrorResponse({ status: 500 });
    fail(serverError);

    expect(pager.error()).toBe(serverError);
    expect(pager.items()).toEqual([]);
    expect(pager.hasMore()).toBe(false);
  });
});
