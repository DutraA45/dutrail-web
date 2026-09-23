/**
 * Tipos que espelham os payloads da `dutrail-api` para o fluxo web
 * (`X-Client-Type: web`). Nesse fluxo o refresh token nunca aparece em nenhum
 * corpo: ele vai só no cookie httpOnly, que o JavaScript não consegue ler.
 */

/** Único formato de usuário que a API devolve (sem senha, hash nem `googleId`). */
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  /** `false` para contas criadas via Google que nunca definiram senha. */
  hasPassword: boolean;
  /** Data ISO 8601 (o JSON não tem tipo Date). */
  createdAt: string;
}

/** `POST /auth/signup`. A API rejeita campos desconhecidos com 400. */
export interface SignupRequest {
  email: string;
  /** Entre 8 e 128 caracteres. */
  password: string;
  name?: string;
}

/** `POST /auth/login`. Enviar qualquer campo além destes gera 400. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** `POST /auth/google/exchange`. */
export interface GoogleCodeExchangeRequest {
  /** Exatamente 43 caracteres base64url, de uso único e válido por 60 s. */
  code: string;
}

/** Resposta de signup, login e google/exchange no fluxo web. */
export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** Resposta de `POST /auth/refresh` no fluxo web. */
export interface RefreshResponse {
  accessToken: string;
}
