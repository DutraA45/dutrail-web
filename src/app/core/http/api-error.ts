import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

/** Formato único de erro da API (filtro global do NestJS). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  /** Array nos erros de validação (400); string nos demais. */
  message: string | string[];
  path: string;
  timestamp: string;
}

/** Mensagem específica por status HTTP, para a tela ajustar o texto ao contexto. */
export type ApiErrorMessageOverrides = Partial<Record<number, string>>;

// Sem 409 de propósito: o significado depende da rota (email já cadastrado no
// signup, atividade já importada na importação), então cada tela trata o seu.
const DEFAULT_MESSAGES: Readonly<Record<number, string>> = {
  [HttpStatusCode.Unauthorized]: 'Sua sessão expirou. Entre novamente.',
};

const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
const UNEXPECTED_ERROR_MESSAGE = 'Algo deu errado. Tente novamente em instantes.';

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    'message' in value &&
    (typeof value.message === 'string' || Array.isArray(value.message))
  );
}

/** Status HTTP de um erro qualquer, ou `null` se não veio de uma resposta HTTP. */
export function httpStatusOf(error: unknown): number | null {
  return error instanceof HttpErrorResponse ? error.status : null;
}

/**
 * Falha passageira, que não diz nada sobre a sessão: erro de rede (status 0),
 * 429 ou 5xx. Nesses casos a sessão pode estar viva e vale tentar de novo depois.
 */
export function isTransientHttpError(error: unknown): boolean {
  const status = httpStatusOf(error);
  return (
    status === 0 ||
    status === HttpStatusCode.TooManyRequests ||
    (status !== null && status >= HttpStatusCode.InternalServerError)
  );
}

/**
 * Traduz qualquer erro vindo da API em mensagens prontas para exibir ao usuário.
 *
 * Centralizar isso aqui evita que cada tela reinvente o tratamento de 0/400/401/
 * 429/5xx. As telas só passam `overrides` quando o mesmo status significa algo
 * diferente no seu contexto (ex. 401 no login = credenciais inválidas) ou
 * quando ele só tem sentido numa rota (ex. 409).
 */
export function describeApiError(
  error: unknown,
  overrides: ApiErrorMessageOverrides = {},
): string[] {
  if (!(error instanceof HttpErrorResponse)) {
    return [UNEXPECTED_ERROR_MESSAGE];
  }

  // Status 0: a request nem chegou a ter resposta (API fora do ar, CORS, rede).
  if (error.status === 0) {
    return [NETWORK_ERROR_MESSAGE];
  }

  const override = overrides[error.status];
  if (override) {
    return [override];
  }

  // 400 traz o motivo exato (inclusive a lista de erros de validação), que é
  // mais útil do que qualquer texto genérico.
  if (error.status === HttpStatusCode.BadRequest && isApiErrorBody(error.error)) {
    const { message } = error.error;
    return Array.isArray(message) ? message : [message];
  }

  if (error.status === HttpStatusCode.TooManyRequests) {
    return [describeTooManyRequests(error.headers.get('Retry-After'))];
  }

  const fallback = DEFAULT_MESSAGES[error.status];
  if (fallback) {
    return [fallback];
  }

  return [UNEXPECTED_ERROR_MESSAGE];
}

/**
 * Mensagem do 429 a partir do header `Retry-After` (em segundos, como o
 * contrato garante). Abaixo de um minuto, em segundos; a partir disso, em
 * minutos arredondados para cima. Ausente ou não numérico (ex. 429 de um proxy), o
 * tempo é desconhecido.
 */
export function describeTooManyRequests(retryAfter: string | null): string {
  const seconds = parseRetryAfterSeconds(retryAfter);
  if (seconds === null) {
    return 'Muitas tentativas. Aguarde alguns instantes e tente de novo.';
  }
  if (seconds < 60) {
    return `Muitas tentativas. Tente de novo em ${pluralize(seconds, 'segundo', 'segundos')}.`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `Muitas tentativas. Tente de novo em ${pluralize(minutes, 'minuto', 'minutos')}.`;
}

function parseRetryAfterSeconds(value: string | null): number | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return null;
  }
  // "0" vira 1 s: "tente de novo em 0 segundos" não faz sentido para o usuário.
  return Math.max(1, Number(trimmed));
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
