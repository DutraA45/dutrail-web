import { validateFitFile } from './fit-file-import';

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
