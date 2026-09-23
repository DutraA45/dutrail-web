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

const DEFAULT_MESSAGES: Readonly<Record<number, string>> = {
  [HttpStatusCode.Unauthorized]: 'Sua sessão expirou. Entre novamente.',
  [HttpStatusCode.Conflict]: 'Este email já está em uso.',
  [HttpStatusCode.TooManyRequests]: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
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
 * Traduz qualquer erro vindo da API em mensagens prontas para exibir ao usuário.
 *
 * Centralizar isso aqui evita que cada tela reinvente o tratamento de 0/400/401/
 * 409/429/5xx. As telas só passam `overrides` quando o mesmo status significa
 * algo diferente no seu contexto (ex. 401 no login = credenciais inválidas).
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

  const fallback = DEFAULT_MESSAGES[error.status];
  if (fallback) {
    return [fallback];
  }

  return [UNEXPECTED_ERROR_MESSAGE];
}
