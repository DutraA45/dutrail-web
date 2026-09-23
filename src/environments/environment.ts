/**
 * Configuração de ambiente.
 *
 * Em desenvolvimento a API roda em `http://localhost:3000` e só aceita CORS da
 * origem `http://localhost:4200` (variável `FRONTEND_URL` da API), por isso o
 * `ng serve` precisa continuar na porta padrão.
 */
export const environment = {
  apiBaseUrl: 'http://localhost:3000',
};
