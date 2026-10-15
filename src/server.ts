import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/**
 * Hosts aceitos (`Host`/`X-Forwarded-Host`): vêm da variável `NG_ALLOWED_HOSTS`,
 * lida pelo próprio Angular (lista separada por vírgula, ex.
 * `163-176-80-68.nip.io`). Request com outro host recebe 400, o que impede
 * SSRF por um `Host` forjado. Sem a variável, nenhum host é aceito, então ela é
 * obrigatória em todo ambiente que roda este servidor (o `ng serve` não usa este
 * arquivo).
 *
 * Proxy: o Nginx da mesma máquina repassa o host e o protocolo públicos em
 * `X-Forwarded-Host` e `X-Forwarded-Proto`, que o Angular usa para montar a URL
 * da request (ex. o `Location` dos redirects). Por padrão ele os ignora e
 * descarta; aqui eles são confiáveis porque o servidor só escuta em
 * `127.0.0.1` (ver `HOST` abaixo), atrás do Nginx. `X-Forwarded-For` entra na
 * lista só para não ser descartado com um aviso a cada request; o Angular não
 * o usa.
 */
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: ['x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for'],
});

/**
 * Arquivos estáticos de /browser. Em produção o Nginx já os serve do disco;
 * isto cobre quem roda o servidor sem ele.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Todo o resto vai para o Angular: páginas pré-renderizadas, renderizadas no
 * servidor, ou o shell da SPA para as rotas `RenderMode.Client`.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Sobe o servidor quando este módulo é o ponto de entrada (ou roda via PM2).
 * `PORT` (padrão 4000) e `HOST` (padrão 127.0.0.1) vêm do ambiente; o padrão
 * escuta só na interface local, alcançável apenas pelo Nginx da mesma máquina.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 4000);
  const host = process.env['HOST'] || '127.0.0.1';
  app.listen(port, host, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://${host}:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
