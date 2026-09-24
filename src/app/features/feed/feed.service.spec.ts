import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Activity } from '../../core/activities/activity.models';
import { User } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/http/api-base-url';
import { FeedService } from './feed.service';

const API = 'http://api.test';

const user: User = {
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  avatarUrl: null,
  emailVerified: true,
  hasPassword: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function activity(id: string, startedAt: string): Activity {
  return {
    id,
    userId: user.id,
    name: `Atividade ${id}`,
    sport: 'running',
    startedAt,
    elapsedTimeSeconds: 1800,
    movingTimeSeconds: null,
    distanceMeters: null,
    elevationGainMeters: null,
    averageHeartRateBpm: null,
    maxHeartRateBpm: null,
    calories: null,
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

describe('FeedService', () => {
  let feed: FeedService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
        { provide: AuthService, useValue: { currentUser: signal(user) } },
      ],
    });
    feed = TestBed.inject(FeedService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it("maps a page of the user's own activities, authored by the user, keeping the API order", async () => {
    const page = firstValueFrom(feed.loadPage(null));

    backend.expectOne(`${API}/activities`).flush({
      items: [
        activity('new', '2026-09-20T10:00:00.000Z'),
        activity('old', '2026-09-01T10:00:00.000Z'),
      ],
      nextCursor: 'c1',
    });

    const result = await page;
    expect(result.items.map((item) => item.activity.id)).toEqual(['new', 'old']);
    expect(result.items[0].athlete).toEqual({ id: 'u1', name: 'Ana', avatarUrl: null });
    expect(result.nextCursor).toBe('c1');
  });

  it('passes the cursor through to the API', async () => {
    const page = firstValueFrom(feed.loadPage('c1'));

    backend
      .expectOne(`${API}/activities?cursor=c1`)
      .flush({ items: [activity('older', '2026-08-01T10:00:00.000Z')], nextCursor: null });

    expect((await page).nextCursor).toBeNull();
  });
});
