import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { ActivityDetailPage } from './activity-detail.page';

const API = 'http://api.test';

describe('ActivityDetailPage', () => {
  let fixture: ComponentFixture<ActivityDetailPage>;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityDetailPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ActivityDetailPage);
  });

  afterEach(() => backend.verify());

  // A API responde o mesmo 404 (mesmo `error` e `message`) nos três casos.
  function notFound(id: string): void {
    backend.expectOne(`${API}/activities/${id}`).flush(
      {
        statusCode: 404,
        error: 'Not Found',
        message: 'Activity not found',
        path: `/activities/${id}`,
        timestamp: '2026-09-23T20:29:45.919Z',
      },
      { status: 404, statusText: 'Not Found' },
    );
  }

  async function render(id: string): Promise<HTMLElement> {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<HTMLElement> {
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['an id that does not exist', '9f7e8a66-7a71-42f8-933b-9bf711686091'],
    ["another user's activity", 'f8c9802b-216e-4d02-82df-64d4d7c8001d'],
    ['a malformed id', 'not-a-uuid'],
  ])('shows the same "not found" state for %s', async (_case, id) => {
    await render(id);
    notFound(id);
    const page = await settle();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Atividade não encontrada');
    expect(page.textContent).not.toMatch(/Tentar novamente|acesso/i);
  });

  it('offers a retry for failures other than 404', async () => {
    await render('a1');
    backend
      .expectOne(`${API}/activities/a1`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    const page = await settle();

    const retry = [...page.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Tentar novamente'),
    );
    expect(retry).toBeTruthy();
  });
});
