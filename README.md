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
npm start          # http://localhost:4200
npm test           # testes unitários (Vitest)
npm run build      # build de produção + prerender das páginas públicas
```

A API só libera CORS para `http://localhost:4200` (`FRONTEND_URL`), por isso o
frontend precisa rodar nessa porta. A URL da API fica em
[`src/environments/environment.ts`](src/environments/environment.ts).

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
  `/auth/refresh` e repete a request uma vez. Só existe **um refresh em voo**
  por vez (`TokenRefreshService`), porque reapresentar um refresh token já
  rotacionado faz a API revogar todas as sessões do usuário.
- **F5 na área logada**: os guards aguardam `AuthService.ensureSessionChecked()`,
  que restaura a sessão com `/auth/refresh` + `GET /me` antes de liberar a rota.
- **Google**: o botão navega o browser para `{API}/auth/google`; a API volta
  para `/auth/callback?code=...`, que troca o código em
  `POST /auth/google/exchange`.
- **SSR**: só `/`, `/login` e `/signup` são pré-renderizados. A área logada e o
  callback renderizam só no browser, onde a sessão existe.

## Atividades

Feed, lista e detalhe consomem as rotas reais da API, documentadas em
[`dutrail-api/docs/ACTIVITIES-CONTRACT.md`](../dutrail-api/docs/ACTIVITIES-CONTRACT.md)
e espelhadas em [`core/activities/activity.models.ts`](src/app/core/activities/activity.models.ts).

- **Paginação por cursor**: `GET /activities` devolve `{ items, nextCursor }`.
  O `CursorPager` (`core/http/cursor-pager.ts`) acumula as páginas no botão
  "Carregar mais" e, se a API recusar o cursor (400 `Invalid cursor`),
  recomeça a lista do início. O cursor é opaco: só é devolvido à API.
- **Detalhe**: id inexistente, de outro usuário ou malformado recebem o mesmo
  404, e a tela mostra o mesmo "não encontrada" nos três casos.
- **Pendências (`TODO(api)`)**: importação de `.fit` (`POST /activities/import`
  ainda não existe; a tela mostra que a importação não está disponível) e
  feed de amigos (hoje só as atividades do próprio usuário).

Os itens do menu sem tela ainda (painel, notificações, calendário, rotas,
treino, configurações) já apontam para os caminhos definitivos e abrem a página
"em construção"; para construir um deles, troque o `comingSoon(...)` da rota em
`app.routes.ts`.
