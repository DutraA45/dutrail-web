import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/http/api-base-url';
import { FitFileImport, validateFitFile } from './fit-file-import';

const API = 'http://api.test';

describe('validateFitFile', () => {
  it('accepts non-empty .fit files, whatever the extension case', () => {
    expect(validateFitFile({ name: 'morning-run.fit', size: 1024 })).toBeNull();
    expect(validateFitFile({ name: 'RIDE.FIT', size: 1024 })).toBeNull();
  });

  it('rejects other extensions', () => {
    expect(validateFitFile({ name: 'ride.gpx', size: 1024 })).toMatch(/\.fit/);
    expect(validateFitFile({ name: 'ride.fit.zip', size: 1024 })).toMatch(/\.fit/);
  });

  it('rejects empty files', () => {
    expect(validateFitFile({ name: 'ride.fit', size: 0 })).toMatch(/vazio/);
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

  it('says the activity was already imported on a 409', () => {
    selectFile(new File(['x'], 'ride.fit'));
    failImport(409, 'Esta atividade já foi importada.');

    expect(alertText()).toContain('Esta atividade já foi importada.');
    expect(alertText()).not.toContain('email');
  });

  it('shows the backend text of a 400 as it came (it is in Portuguese)', () => {
    selectFile(new File(['x'], 'ride.fit'));
    failImport(400, 'O arquivo .fit não é de uma atividade (tipo "course").');

    expect(alertText()).toContain('O arquivo .fit não é de uma atividade (tipo "course").');
  });
});
