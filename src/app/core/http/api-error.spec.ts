import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describeApiError, describeTooManyRequests, isTransientHttpError } from './api-error';

function httpError(status: number, error: unknown = null, headers?: Record<string, string>) {
  return new HttpErrorResponse({
    status,
    error,
    headers: new HttpHeaders(headers),
    url: 'http://api.test/x',
  });
}

function apiBody(status: number, message: string | string[]) {
  return { statusCode: status, error: 'Error', message, path: '/x', timestamp: '' };
}

describe('describeApiError', () => {
  it('has no default text for 409: each route gives its own', () => {
    expect(describeApiError(httpError(409, apiBody(409, 'Email already registered')))).toEqual([
      'Algo deu errado. Tente novamente em instantes.',
    ]);
    expect(describeApiError(httpError(409), { 409: 'Esta atividade já foi importada.' })).toEqual([
      'Esta atividade já foi importada.',
    ]);
  });

  it('shows the backend message of a 400, unless the screen overrides it', () => {
    const error = httpError(400, apiBody(400, 'O arquivo .fit está vazio.'));
    expect(describeApiError(error)).toEqual(['O arquivo .fit está vazio.']);
    expect(describeApiError(httpError(400, apiBody(400, ['a', 'b'])))).toEqual(['a', 'b']);
    expect(describeApiError(error, { 400: 'Outra mensagem.' })).toEqual(['Outra mensagem.']);
  });

  it('uses the Retry-After header on a 429', () => {
    expect(describeApiError(httpError(429, null, { 'Retry-After': '42' }))).toEqual([
      'Muitas tentativas. Tente de novo em 42 segundos.',
    ]);
    expect(describeApiError(httpError(429))).toEqual([
      'Muitas tentativas. Aguarde alguns instantes e tente de novo.',
    ]);
  });

  it('lets an override win over the Retry-After text', () => {
    const error = httpError(429, null, { 'Retry-After': '42' });
    expect(describeApiError(error, { 429: 'Calma.' })).toEqual(['Calma.']);
  });
});

describe('describeTooManyRequests', () => {
  it.each([
    ['1', 'Muitas tentativas. Tente de novo em 1 segundo.'],
    ['0', 'Muitas tentativas. Tente de novo em 1 segundo.'],
    ['30', 'Muitas tentativas. Tente de novo em 30 segundos.'],
    ['59', 'Muitas tentativas. Tente de novo em 59 segundos.'],
    ['60', 'Muitas tentativas. Tente de novo em 1 minuto.'],
    ['61', 'Muitas tentativas. Tente de novo em 2 minutos.'],
    ['120', 'Muitas tentativas. Tente de novo em 2 minutos.'],
    ['899', 'Muitas tentativas. Tente de novo em 15 minutos.'],
    [' 900 ', 'Muitas tentativas. Tente de novo em 15 minutos.'],
  ])('formats Retry-After %j', (header, expected) => {
    expect(describeTooManyRequests(header)).toBe(expected);
  });

  it.each([null, '', 'abc', '1.5', '-5', 'Wed, 21 Oct 2026 07:28:00 GMT'])(
    'treats Retry-After %j as unknown time',
    (header) => {
      expect(describeTooManyRequests(header)).toBe(
        'Muitas tentativas. Aguarde alguns instantes e tente de novo.',
      );
    },
  );
});

describe('isTransientHttpError', () => {
  it.each([0, 429, 500, 503])('is true for %i', (status) => {
    expect(isTransientHttpError(httpError(status))).toBe(true);
  });

  it.each([400, 401, 404, 409])('is false for %i', (status) => {
    expect(isTransientHttpError(httpError(status))).toBe(false);
  });

  it('is false for something that is not an HTTP error', () => {
    expect(isTransientHttpError(new Error('boom'))).toBe(false);
  });
});
