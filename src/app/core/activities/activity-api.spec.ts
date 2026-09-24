import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../http/api-base-url';
import { ActivityApi } from './activity-api';

const API = 'http://api.test';

describe('ActivityApi', () => {
  let api: ActivityApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    api = TestBed.inject(ActivityApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('asks for the first page with no query params at all', () => {
    api.listMine().subscribe();

    const req = backend.expectOne(`${API}/activities`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], nextCursor: null });
  });

  it('sends only cursor and limit, with the cursor URL-encoded', () => {
    api.listMine({ cursor: 'WyIy+/=', limit: 50 }).subscribe();

    const req = backend.expectOne((r) => r.url === `${API}/activities`);
    expect(req.request.params.keys().sort()).toEqual(['cursor', 'limit']);
    expect(req.request.urlWithParams).toBe(`${API}/activities?cursor=WyIy%2B/=&limit=50`);
    req.flush({ items: [], nextCursor: null });
  });
});
