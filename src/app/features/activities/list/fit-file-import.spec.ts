import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { FitFileImport, MAX_FIT_FILE_BYTES, validateFitFile } from './fit-file-import';

const API = 'http://api.test';

describe('validateFitFile', () => {
  it('accepts any non-empty file up to exactly 10 MiB', () => {
    expect(validateFitFile({ size: 1 })).toBeNull();
    expect(validateFitFile({ size: 1024 })).toBeNull();
    expect(validateFitFile({ size: 10 * 1024 * 1024 })).toBeNull();
  });

  it('rejects files above 10 MiB', () => {
    expect(validateFitFile({ size: 10 * 1024 * 1024 + 1 })).toBe(
      'O arquivo passa de 10 MB, o tamanho máximo para importação.',
    );
  });

  it('rejects empty files', () => {
    expect(validateFitFile({ size: 0 })).toMatch(/vazio/);
  });
});

describe('FitFileImport', () => {
  let fixture: ComponentFixture<FitFileImport>;
  let backend: HttpTestingController;
  let host: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [FitFileImport],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FitFileImport);
    host = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  function selectFile(file: File): void {
    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
  }

  function failImport(status: number, message: string): void {
    backend
      .expectOne(`${API}/activities/import`)
      .flush(
        { statusCode: status, error: 'Error', message, path: '/activities/import', timestamp: '' },
        { status, statusText: 'Error' },
      );
    fixture.detectChanges();
  }

  const alertText = () => host.querySelector('[role="alert"]')?.textContent ?? '';

  /** Arquivo com `size` bytes de verdade (o `File` do jsdom calcula o tamanho). */
  const fileOfSize = (size: number, name = 'ride.fit') => new File([new Uint8Array(size)], name);

  it('sends a file of exactly 10 MiB', () => {
    selectFile(fileOfSize(MAX_FIT_FILE_BYTES));
    fixture.detectChanges();

    const req = backend.expectOne(`${API}/activities/import`);
    expect((req.request.body as FormData).get('file')).toBeInstanceOf(File);
    req.flush(null, { status: 500, statusText: 'Error' });
  });

  it('blocks a file of 10 MiB + 1 byte before sending', () => {
    selectFile(fileOfSize(MAX_FIT_FILE_BYTES + 1));
    fixture.detectChanges();

    backend.expectNone(`${API}/activities/import`);
    expect(alertText()).toContain('O arquivo passa de 10 MB');
  });

  it('blocks an empty file before sending', () => {
    selectFile(fileOfSize(0));
    fixture.detectChanges();

    backend.expectNone(`${API}/activities/import`);
    expect(alertText()).toContain('vazio');
  });

  it.each(['RIDE.FIT', 'ride.gpx', 'activity'])(
    'does not block by extension: sends %j and lets the API judge the content',
    (name) => {
      selectFile(fileOfSize(16, name));

      backend.expectOne(`${API}/activities/import`).flush(null, { status: 500, statusText: 'E' });
    },
  );

  it('keeps .fit as a hint in the accept attribute', () => {
    expect(host.querySelector('input[type="file"]')?.getAttribute('accept')).toBe('.fit');
  });

  it('says the activity was already imported on a 409', () => {
    selectFile(new File(['x'], 'ride.fit'));
    failImport(409, 'Esta atividade já foi importada.');

    expect(alertText()).toContain('Esta atividade já foi importada.');
    expect(alertText()).not.toContain('email');
  });

  it('shows no message on a 404: the session has ended and the app is going to /login', () => {
    selectFile(new File(['x'], 'ride.fit'));
    failImport(404, 'User not found');

    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector('button')?.disabled).toBe(false);
  });

  it('shows the backend text of a 400 as it came (it is in Portuguese)', () => {
    selectFile(new File(['x'], 'ride.fit'));
    failImport(400, 'O arquivo .fit não é de uma atividade (tipo "course").');

    expect(alertText()).toContain('O arquivo .fit não é de uma atividade (tipo "course").');
  });
});
