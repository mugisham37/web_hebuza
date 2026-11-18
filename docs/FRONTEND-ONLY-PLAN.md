# FRONTEND-ONLY PLAN — remove the in-app backend, run on dummy data

Goal: HEBUZA POSIBA becomes a **frontend-only** Next.js app (design + docs + clickable product) that runs with
**no database, Redis, queue, S3, email or secrets**. Every screen looks and behaves exactly as today, fed by dummy
data. A separate backend (API server + workers, built later) plugs in by implementing the **same HTTP contract**
(`openapi.json`) — the frontend then flips one env flag and talks to it.

Status: PLAN ONLY. Nothing is changed until you say go.

---

## 0. What exists today (analysis)

| Area                                  | Size                                                                                                                                                                                                  | Notes                                                                                                                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/server/`                         | 178 files                                                                                                                                                                                             | `core/` (auth, db, redis, jobs, storage, email, pdf, ratelimit, audit…), `db/` (19 Drizzle schemas + migrations + seed), `modules/` (≈110 routes/services/jobs/seeds), DAL, rss, preview, referral/campaign links                                            |
| `src/app/(endpoints)/`                | 9 route handlers                                                                                                                                                                                      | `api/[...path]` (the whole API), `api/realtime/stream` (SSE), `health`, `health/ready`, `preview`, `preview/exit`, `hooks/revalidate`, `r/[code]`, `c/[code]`                                                                                                |
| Frontend → server **direct** coupling | 16 files                                                                                                                                                                                              | `proxy.ts`, `instrumentation.ts`, `rss.xml/route.ts`, `lib/catalogue.ts`, `lib/actions/public-forms.ts`, `lib/marketing/cms/read.ts`, `lib/query/prefetch.tsx` + the 9 endpoint routes                                                                       |
| Frontend → server **over HTTP**       | ~181 files                                                                                                                                                                                            | atoms/molecules/organisms + `lib/*/api.ts` call `api` (openapi-fetch) at same-origin `/api/*`. **These stay unchanged** — only what answers `/api/*` changes.                                                                                                |
| Contract                              | `lib/api/openapi.json` + `schema.d.ts` (16k lines, 191 paths)                                                                                                                                         | Becomes the handover spec for the future backend.                                                                                                                                                                                                            |
| Existing mocks                        | `src/mocks/` 29 files (worlds + MSW handlers, ~250 handlers)                                                                                                                                          | From the pre-backend era. MSW bootstrap (`browser.ts`, `public/mockServiceWorker.js`) is gone; `msw@3` still in devDeps; `NEXT_PUBLIC_API_MOCKING` flag still read in 3 places. Coverage vs the 191 current paths is **unknown** — must be diffed (Phase 2). |
| Infra                                 | `docker-compose.yml`, `drizzle.config.ts`, `cache-handler.js` (Redis), `scripts/migrate.mjs`, `next.config.ts` (`cacheHandlers`, `serverExternalPackages`, `authInterrupts`)                          |                                                                                                                                                                                                                                                              |
| Tests                                 | `tests/contract/*` (6), `tests/unit/*` (14, mostly server), `tests/seed`                                                                                                                              |                                                                                                                                                                                                                                                              |
| Server-only deps                      | `drizzle-orm postgres pg-boss ioredis @aws-sdk/* resend @node-rs/argon2 jose(server part) @react-pdf/renderer sharp(keep, Next uses it) pino @opentelemetry/* @vercel/otel qrcode(check) zod-openapi` |                                                                                                                                                                                                                                                              |

**Key decision:** the mock layer answers HTTP, not imports. Components keep calling `/api/*` exactly like they
will against the real backend, so the later swap is a config change, not a refactor. Two ways to answer `/api/*`
without a backend — I recommend **A**:

- **A. MSW in the browser + a tiny mock route for the server side (recommended).** Client hooks (TanStack Query)
  are intercepted by MSW in the browser. Server Components that need data read the **same mock worlds** directly
  (pure TS, no DB). Zero network, works on static hosting / Vercel preview.
- B. Keep one catch-all `app/api/[...path]/route.ts` that dispatches to the MSW handlers on the server. Simpler
  single path, but it is "a server" again and blurs the boundary you asked for. Rejected.

---

## 1. Target architecture

```
components (atoms / molecules / organisms)   ← unchanged
        │  useQuery / api.GET("/api/…")
        ▼
src/lib/api/client.ts  ── baseUrl = NEXT_PUBLIC_API_URL ?? ""   (real backend later)
        │
        ├─ NEXT_PUBLIC_API_MOCKING=on  → MSW (src/mocks/browser.ts) answers in the browser
        └─ off + NEXT_PUBLIC_API_URL   → future backend (same openapi contract, CORS + cookies)

Server Components / proxy / rss / sitemap  → src/data/*  (static seed + mock worlds, pure TS, no I/O)
```

Rules after migration (enforced by `check:layers`):

1. No `src/server/`, no `@/server/*` imports, no `"use server"`, no `server-only` DB/Redis code.
2. Components never import `src/mocks/*` (only `lib/api`, `lib/*/api.ts`, `src/data/*`).
3. `src/mocks/*` may import `src/data/*` and `lib/*` pure rules; never the reverse.
4. Every API path in `openapi.json` has a mock handler (coverage script fails CI otherwise).

---

## 2. Phases

Each phase ends green on: `npm run typecheck`, `npm run lint`, `npm run check:layers`, `npm run check:design`,
`npm run build`. Commit (only when you ask) one per phase so any phase can be reverted.

### Phase 0 — Safety net (1 agent, me)

- Snapshot commit of the current tree (1,075 uncommitted files) **— needs your OK to commit**.
- Tag `backend-in-next-final` so the deleted server code is recoverable as the starting point for the new backend repo.
- Record a baseline: list of all routes (`next build` output) + Playwright screenshots of ~25 key pages
  (home, /services, a service, book flow, login, each workspace dashboard) for visual diff in Phase 6.

### Phase 1 — Contract freeze (1 agent)

- Move `src/lib/api/openapi.json` → `contract/openapi.json` (source of truth for the future backend); keep
  `npm run api:types` generating `src/lib/api/schema.d.ts` from it.
- Write `contract/README.md`: envelope shape `{success,message,errorType,data}`, auth cookies
  (`hebuza_access`/`hebuza_refresh`, refresh at `GET /api/auth/session`), idempotency header, `x-request-id`,
  error types used by `lib/api/error-copy.ts`, SSE stream format (`/api/realtime/stream`), upload flow
  (`lib/api/upload.ts`), pagination shape. This is what the backend team builds against.
- Export a list of **domain events/jobs** the in-app backend ran (from `src/server/modules/*.jobs.ts`,
  `core/events.ts`) into `contract/JOBS.md` — the worker spec, so nothing the old backend did is forgotten.

### Phase 2 — Mock layer rebuilt (wave of 4 builders + 1 integrator)

1. **Coverage diff script** `scripts/check-mocks.mjs`: parse `contract/openapi.json` paths×methods vs MSW
   handlers; print missing/extra. Add `npm run check:mocks`.
2. **Bootstrap**: `npx msw init public/`, `src/mocks/browser.ts` (`setupWorker(...handlers)`), `src/mocks/handlers.ts`
   (aggregates all domain handler files), and a `MockProvider` in the root providers that awaits
   `worker.start({ onUnhandledRequest: "warn" })` before rendering queries when `NEXT_PUBLIC_API_MOCKING=on`
   (default **on** in `.env.example`).
3. **Fill the gaps** — port missing handlers using the **server seeds as the dummy-data source**
   (`src/server/modules/*.seed.ts`, `src/server/db/seed.ts`) so the data is the same the app shows today.
   Split by domain, strict file ownership:
   - Builder A: auth, account, platform, subscriptions, catalogue, booking, assistant, chat
   - Builder B: finance, payments, ledger, procurement, reports
   - Builder C: ops, field, work, workforce, agent, applications, documents, notifications
   - Builder D: marketing, cms, system, compliance, realtime (SSE via MSW `http.get` returning a
     `ReadableStream`), uploads (return an object URL)
   - Business rules the handlers need (state machines, VAT, SoD, 4-eyes) come from the existing **pure** `lib/*`
     rules (`lib/finance/states.ts`, `lib/field/rules.ts`, `lib/money`), never from `src/server`.
4. **Personas / auth**: login handler sets a non-httpOnly `hebuza_persona` cookie + returns a fake JWT whose
   payload carries roles, so `proxy.ts` route guards (`rolesFromJwt`) keep working. Persona switcher already
   exists (`design/personas.tsx`, `mocks/personas.ts`).
5. **State**: mutations persist in memory + `sessionStorage` per world, with a "Reset demo data" action in the
   design/persona page. `// shortcut: per-tab in-memory state, upgrade never (real backend replaces it)`.
6. Integrator: `check:mocks` = 0 missing; click through each workspace.

### Phase 3 — Server-side reads → static data (1–2 agents)

Create `src/data/` (pure TS, no I/O) and repoint the 7 direct couplings:

| File                                           | Today                               | After                                                                                                      |
| ---------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lib/marketing/cms/read.ts`                    | DB via `cms.service`, seed fallback | seed only (`content/cms-seed.ts`); keep `draftMode` preview off; keep `"use cache"`                        |
| `lib/catalogue.ts` (`fromDb`, subscriptions)   | DB, fallback to content             | content/`src/data/catalogue.ts` only                                                                       |
| `lib/query/prefetch.tsx`                       | `serverGet` via DAL                 | **delete**; `<Prefetch>` callers (3 pages) render children directly — client hooks fetch from MSW          |
| `lib/actions/public-forms.ts` (`"use server"`) | `serverPost`                        | **delete**; forms submit via `api.POST` client-side (MSW answers). No-JS fallback is dropped `// shortcut` |
| `proxy.ts`                                     | lazy DB read of CMS slugs/redirects | seed slugs + static redirects from `content/` only; JWT/persona guards unchanged                           |
| `rss.xml/route.ts`                             | `@/server/rss`                      | move rss builder into `src/data/rss.ts` reading the seed (it's a static route handler, no backend)         |
| `instrumentation.ts`                           | OTel + pg-boss start                | **delete** (or keep a no-op)                                                                               |

Also: `lib/i18n/server.ts`, `lib/auth` server session helpers that read cookies for SSR — make the session come
from the persona cookie decoded locally (no DB). Server pages calling `unauthorized()/forbidden()` keep working via
the decoded roles.

### Phase 4 — Delete the backend (1 agent)

- `rm -rf src/server src/app/(endpoints) cache-handler.js drizzle.config.ts docker-compose.yml scripts/migrate.mjs
tests/contract tests/seed tests/stubs` and server-only unit tests (`audit-chain, auth, crypto, jwt, ledger,
payments, pipeline, subscriptions, *-db, applications, catalogue, cms` — keep any that only test `lib/*` pure rules,
  repointing imports).
- Keep `/r/[code]` and `/c/[code]` short links as **static redirects** in `next.config.ts` (`redirects()` from
  `content/`), so printed QR/campaign links still resolve.
- `/health` → tiny static `app/health/route.ts` returning `{ok:true}` (hosting probes) — or drop. Preview +
  revalidate webhooks dropped (no CMS backend). `rss.xml` kept (Phase 3).
- `next.config.ts`: remove `cacheHandlers`, `serverExternalPackages`, server comments; keep `authInterrupts`
  (still used by guards), `cacheComponents`, images, headers. Add rewrites for `/api/*` → `NEXT_PUBLIC_API_URL` only
  when set (later).
- `package.json`: remove deps `drizzle-orm postgres pg-boss ioredis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
resend @node-rs/argon2 pino @opentelemetry/* @vercel/otel zod-openapi` (+ `jose`, `qrcode`, `@react-pdf/renderer`
  only if no frontend file uses them — grep first), devDeps `drizzle-kit`; remove scripts `db:*`, `test:contract`.
  Move `msw` to dependencies-dev stays. `npm install` → lockfile.
- `.env.example`: only `NEXT_PUBLIC_API_MOCKING=on`, `NEXT_PUBLIC_API_URL=`, `NEXT_PUBLIC_SITE_URL`.
- `lib/api/client.ts`: `baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ""`; drop server-side `API_URL/PORT` branch;
  keep refresh/retry middleware (the real backend will use it).

### Phase 5 — Guardrails (1 agent)

- `check:layers`: fail on `@/server`, `"use server"`, `drizzle|postgres|ioredis|pg-boss` imports, and components
  importing `@/mocks`.
- `check:mocks` added to `npm run ci`.
- `DemoValue` / demo pills stay (they already key off `NEXT_PUBLIC_API_MOCKING`).
- Sweep comments mentioning `src/server`, "DAL", "route table" → point at `contract/README.md`.
- Update `README.md`: "Frontend only. Run `npm run dev` — data is mocked. Backend contract in `contract/`."
- Archive `BACKEND-PLAN.md` → `contract/BACKEND-PLAN.md` (it becomes the backend repo's starting doc).

### Phase 6 — Verification (1 agent + me)

- `npm run ci` green; `next build` route list == Phase 0 baseline minus `(endpoints)`.
- Playwright: same ~25 screenshots, pixel diff vs baseline (allow mosaic shuffle region). Then a click-through
  per persona (client, agent, ops, finance, procurement, marketing, system, field, exec): every page loads with
  data, every primary mutation (book, approve, pay, upload, apply) succeeds against MSW, no console
  `[MSW] unhandled` warnings.
- `grep -r "@/server\|use server\|DATABASE_URL\|REDIS_URL" src` → empty.
- App boots with **no** `.env.local` and docker stopped.

---

## 3. Agent deployment

| Wave  | Agents                                | Ownership                                                                              |
| ----- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| P0–P1 | me                                    | snapshot, baseline, contract docs                                                      |
| P2    | 4 builders (A–D above) + 1 integrator | strict per-domain handler files; integrator owns `handlers.ts`, `browser.ts`, provider |
| P3    | 1 builder                             | the 7 coupling files + `src/data/`                                                     |
| P4–P5 | 1 builder                             | deletions, config, deps, guardrails                                                    |
| P6    | 1 verifier + me                       | screenshots, click-through, report                                                     |

Small waves (≤4) per your 403-risk preference; if 403s return, run sequentially.

## 4. Risks / what changes for users of the demo

- **No persistence across browsers/devices** — dummy data resets per tab session. Expected for design/docs use.
- **SSR first paint of workspace pages** becomes client-fetched (brief skeleton instead of server-prefetched data).
- **No-JS public forms** stop working (they'll need JS). Acceptable for a demo; the real backend can restore it.
- **CMS edits in the marketing editor** only live in mock state; the public site reads the seed. Editor still works visually.
- **Mock coverage** is the big unknown until the Phase 2 diff runs — biggest effort is likely there.
- Deleted backend is preserved only in git (tag in Phase 0) — **don't skip Phase 0**.

## 5. Out of scope

Building the new backend/workers; changing any visual design; translations review.
