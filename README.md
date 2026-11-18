# HEBUZA web

Next.js 16 frontend: public site + all workspaces. Talks to the server only over HTTP (`/api/*` proxied via `API_URL`).

```bash
pnpm install
pnpm dev                 # without API_URL, /api/* is answered by MSW dummy data (src/mocks)
API_URL=http://localhost:4000 pnpm dev
```

- Typed client: `src/lib/api/schema.d.ts`, regenerate with `pnpm api:types` (live server) or `pnpm api:types:file` (`../server/openapi.json`); commit it.
- `src/shared/` mirrors the display-only parts of `server/src/domain` (`pnpm check:mirror` flags drift; the server enforces).
- Components: `src/components/{atoms,molecules,organisms}` (`pnpm check:layers`, `pnpm check:design`).
- Full check: `pnpm ci` (`pnpm check:mocks` is informational, not in CI). E2E against the real stack: `pnpm e2e` (resets the DB via `../server`).
- Docker: `docker build -t hebuza-web .` (standalone output). Deploy (Vercel or Render): `../docs/DEPLOY.md`.
