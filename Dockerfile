# Next.js standalone server. Build from this folder: docker build -t hebuza-web web/
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Mocks are compiled out of production images (MSW off); NEXT_PUBLIC_* are baked at build time.
ARG NEXT_PUBLIC_SITE_URL=https://hebuza.example
ARG DEPLOYMENT_VERSION=dev
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ENV NEXT_PUBLIC_API_MOCKING=off NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN pnpm build

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
ENV NODE_ENV=production HOSTNAME=:: PORT=3000
WORKDIR /app
COPY --from=build --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=build --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=build --chown=nonroot:nonroot /app/public ./public
EXPOSE 3000
CMD ["server.js"]
