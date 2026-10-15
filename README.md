# Dutrail Web

Frontend do **Dutrail**, em Angular 22 (standalone, signals, Signal Forms, SSR),
consumindo a [`dutrail-api`](../dutrail-api) (NestJS). A UI usa
[spartan/ui](https://spartan.ng) sobre Tailwind CSS 4.

O contrato de autenticação que este cliente implementa está em
[`dutrail-api/docs/API-CONTRACT.md`](../dutrail-api/docs/API-CONTRACT.md).

## Rodando localmente

Pré-requisitos: Node 22+ e a `dutrail-api` rodando em `http://localhost:3000`.

```bash
npm install
npm start          # http://localhost:4200 (com proxy de /api para a API)
npm test           # testes unitários (Vitest)
npm run build      # build de produção + prerender das páginas públicas
```

### API na mesma origem: `/api` e o proxy do `ng serve`

O frontend chama a API sempre pela base **relativa** `/api`, definida num só
lugar ([`src/environments/environment.ts`](src/environments/environment.ts),
via token `API_BASE_URL`). Não há URL absoluta da API no código.

- **Produção**: o Nginx encaminha `https://<host>/api/` para a API, então
  frontend e API dividem a mesma origem.
- **Desenvolvimento**: o `ng serve` faz o mesmo com o
  [`proxy.conf.json`](proxy.conf.json) (ligado em `angular.json` →
  `serve.options.proxyConfig`), que repassa `http://localhost:4200/api/*` para
  `http://localhost:3000/api/*`.

Com isso o dev se comporta como produção: sem CORS, e o cookie do refresh
token (`Path=/api/auth`) e o de state do Google (`Path=/api/auth/google`)
chegam à API pelo próprio browser. Na API, `CORS_ORIGINS` pode ficar vazio e
`FRONTEND_URL` continua `http://localhost:4200` (destino do redirect do login
com Google). O `GOOGLE_CALLBACK_URL` da API precisa ter o prefixo:
`http://localhost:3000/api/auth/google/callback` (ou
`http://localhost:4200/api/auth/google/callback`, passando pelo proxy), igual à
"Authorized redirect URI" do console do Google. Os cookies valem para o host
`localhost` em qualquer porta, então as duas opções funcionam.

## Estrutura

```
src/app/
├── core/        singletons que atravessam a aplicação (nada de UI reutilizável)
│   ├── activities/  modelo Activity, ActivityApi e formatação de métricas
│   ├── auth/        sessão: AuthService, token em memória, refresh, guards, interceptor de 401
│   ├── http/        URL da API, headers obrigatórios, tradução de erros da API
│   └── navigation/  caminhos das telas usados em guards, redirects e na sidebar
├── shared/      componentes reutilizáveis entre features, sem regra de negócio
│   └── ui/          ex.: ErrorAlert (alerta de erro padrão sobre o hlm-alert)
└── features/    uma pasta por funcionalidade, cada uma carregada sob demanda
    ├── landing/     página pública (/)
    ├── auth/        /login, /signup e /auth/callback (retorno do Google)
    ├── app-shell/   layout da área logada (/app): sidebar inset, menu e conta/logout
    ├── feed/        /app/feed (home): atividades em ordem cronológica
    ├── activities/  /app/activities (lista + importação .fit) e /app/activities/:id
    └── coming-soon/ página "em construção" das telas planejadas do menu

libs/ui/         componentes spartan/ui ("helm") gerados pela CLI do spartan
```

Regras de dependência: `features` importam de `core` e `shared`, nunca umas das
outras; `shared` não conhece `core`; `core` não tem componentes. Por isso as
rotas da área logada (layout + features dentro dele) são montadas em
`app.routes.ts`, e não dentro do `app-shell`.

Os componentes em `libs/ui` são código copiado para o projeto (como no
shadcn/ui) e importados pelo alias `@spartan-ng/helm/*`. Para adicionar um novo:

```bash
npx ng g @spartan-ng/cli:ui <componente>   # ex.: dialog, select
```

## Autenticação em resumo

- **Access token**: só em memória (`AccessTokenStore`), nunca em
  `localStorage`. Vai em `Authorization: Bearer` em toda chamada à API.
- **Refresh token**: cookie `httpOnly` definido pela API; o JavaScript nunca o
  vê. Toda request leva `X-Client-Type: web` e `withCredentials: true`.
- **401 em uma request comum**: o `refreshOnUnauthorizedInterceptor` chama
  `/api/auth/refresh` e repete a request uma vez. Só existe **um refresh em voo**
  por vez (`TokenRefreshService`), porque reapresentar um refresh token já
  rotacionado faz a API revogar todas as sessões do usuário.
- **F5 na área logada**: os guards aguardam `AuthService.ensureSessionChecked()`,
  que restaura a sessão com `/api/auth/refresh` + `GET /api/me` antes de liberar a rota.
- **Google**: o botão navega o browser (página inteira, não XHR) para
  `/api/auth/google`; a API volta para `/auth/callback?code=...` (rota do
  Angular), que troca o código em `POST /api/auth/google/exchange`.
- **401 que não dispara refresh**: `/api/auth/signup`, `/api/auth/login`,
  `/api/auth/refresh`, `/api/auth/logout` e `/api/auth/google/exchange`
  (caminho exato; ver `core/http/api-base-url.ts`).

## Renderização híbrida (SSR)

Definida em [`src/app/app.routes.server.ts`](src/app/app.routes.server.ts). O
servidor nunca conhece a sessão (o cookie do refresh token só vai para
`/api/auth`), então tudo o que ele gera é a versão "deslogada".

| Rota                     | Modo        | Por quê                                                                |
| ------------------------ | ----------- | ---------------------------------------------------------------------- |
| `/`, `/login`, `/signup` | `Prerender` | Conteúdo 100% estático: HTML gerado no build e servido pronto          |
| `/auth/callback`         | `Client`    | Troca o `code` pela sessão, o que só pode acontecer no browser         |
| `/app`, `/app/**`        | `Client`    | Área logada: o servidor entrega só o shell da SPA                      |
| `**`                     | `Server`    | Caminho desconhecido: o servidor já responde o redirect (302) para `/` |

Quem já está logado e abre `/login` ou `/signup` é mandado para `/app` pelo
`guestOnlyGuard`, no browser. Nenhuma página pública chama a API durante a
renderização no servidor.

## Atividades

Feed, lista e detalhe consomem as rotas reais da API, documentadas em
[`dutrail-api/docs/ACTIVITIES-CONTRACT.md`](../dutrail-api/docs/ACTIVITIES-CONTRACT.md)
e espelhadas em [`core/activities/activity.models.ts`](src/app/core/activities/activity.models.ts).

- **Paginação por cursor**: `GET /api/activities` devolve `{ items, nextCursor }`.
  O `CursorPager` (`core/http/cursor-pager.ts`) acumula as páginas no botão
  "Carregar mais" e, se a API recusar o cursor (400 `Invalid cursor`),
  recomeça a lista do início. O cursor é opaco: só é devolvido à API.
- **Detalhe**: id inexistente, de outro usuário ou malformado recebem o mesmo
  404, e a tela mostra o mesmo "não encontrada" nos três casos.
- **Importação de `.fit`** (`POST /api/activities/import`): valida tamanho
  (vazio, acima de 10 MiB) antes de enviar; 409 vira "Esta atividade já foi
  importada.", 413 tem texto próprio, e 404 `User not found` encerra a sessão.
- **Pendência (`TODO(api)`)**: feed de amigos (hoje só as atividades do
  próprio usuário).

Os itens do menu sem tela ainda (painel, notificações, calendário, rotas,
treino, configurações) já apontam para os caminhos definitivos e abrem a página
"em construção"; para construir um deles, troque o `comingSoon(...)` da rota em
`app.routes.ts`.

## Produção

```bash
npm run build      # configuração production (padrão)
```

Saída em `dist/dutrail-web/`:

- `browser/`: arquivos estáticos com hash (o Nginx os serve direto do disco),
  mais `index.html`, `login/index.html` e `signup/index.html` pré-renderizados
  e `index.csr.html` (shell da SPA).
- `server/server.mjs`: servidor Node (Express + Angular SSR). Os imports de
  terceiros (Express, Angular) já vêm empacotados: basta copiar a pasta
  `dist/dutrail-web` inteira e rodar com Node 22+, **sem `node_modules`**.

Sem sourcemaps em produção (`sourceMap: false`).

```bash
NG_ALLOWED_HOSTS=163-176-80-68.nip.io PORT=4000 HOST=127.0.0.1 \
  node dist/dutrail-web/server/server.mjs
```

| Variável           | Padrão      | Para quê                                                                                                                                 |
| ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`             | `4000`      | Porta do servidor                                                                                                                        |
| `HOST`             | `127.0.0.1` | Interface em que escuta; só local, atrás do Nginx                                                                                        |
| `NG_ALLOWED_HOSTS` | (nenhum)    | **Obrigatória.** Hosts aceitos em `Host`/`X-Forwarded-Host`, separados por vírgula; outros recebem 400 (proteção contra SSRF do Angular) |

Para testar o build localmente: `npm run serve:ssr:dutrail-web` (usa
`NG_ALLOWED_HOSTS=localhost,127.0.0.1` se a variável não estiver definida) e
abra `http://localhost:4000`.

O servidor confia em `X-Forwarded-Host` e `X-Forwarded-Proto` (e mantém
`X-Forwarded-For`), porque só escuta em `127.0.0.1`, atrás do Nginx. O Angular
valida **também** o header `Host`, então o Nginx precisa repassar o host
público nele:

```nginx
location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
}
```
