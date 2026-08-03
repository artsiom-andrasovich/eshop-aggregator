# E-Shop Aggregator

[![CI](https://github.com/artsiom-andrasovich/eshop-aggregator/actions/workflows/ci.yml/badge.svg)](https://github.com/artsiom-andrasovich/eshop-aggregator/actions/workflows/ci.yml)

Multi-vendor e-shop aggregator platform: a NestJS backend, a React + TypeScript + Tailwind frontend,
and a synchronization layer that pulls products from independent seller APIs.

## Stack

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: NestJS, Prisma, PostgreSQL, Swagger
- **Infra**: Docker, GitHub Actions

## Monorepo layout

```
apps/
  backend/    NestJS API (auth, products, cart, orders, reviews, returns, sync)
  frontend/   React SPA
packages/
  shared/     Shared types/DTOs used by both apps
docs/         Architecture decisions
```

## Prerequisites

- Node.js 22+
- pnpm (`corepack enable` will provide it)
- Docker (for Postgres / full stack)

## Environment files

| File | Used by |
|---|---|
| `.env` (repo root) | Docker Compose — substitutes `${VAR}` in `docker-compose.yml` |
| `apps/backend/.env` | Local Nest / Prisma CLI when working inside `apps/backend` |

Both are gitignored. Start from the repo-root template:

```bash
cp .env.example .env
cp .env.example apps/backend/.env
```

Set `JWT_ACCESS_SECRET` in both (min 32 chars):

```bash
openssl rand -base64 48
```

Nest also falls back to the repo-root `.env` when `apps/backend/.env` is missing a value.

## Getting started (local backend)

```bash
pnpm install
docker compose up -d postgres

cd apps/backend
pnpm exec prisma migrate dev
pnpm run start:dev   # http://localhost:3000, Swagger at /api/docs

# frontend (separate terminal)
cd apps/frontend
cp .env.example .env
pnpm run dev         # http://localhost:5173
```

Postgres from compose is on host port **5433** (`DATABASE_URL` in `.env.example`).

## Full stack via Docker

```bash
cp .env.example .env   # fill JWT_ACCESS_SECRET
docker compose up --build
```

- Backend: `http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`
- Frontend: `http://localhost:5173`

The backend container runs `prisma migrate deploy` on startup (see `apps/backend/Dockerfile`).

If Docker fails with **P3005** on an existing dev volume (tables exist but no migration history), run once:

```bash
cd apps/backend
pnpm exec prisma migrate resolve --applied 20260730031509_add_user_and_refresh_token
```

Or reset the volume: `docker compose down -v`.

## CI

GitHub Actions runs lint, typecheck, build, unit tests, e2e auth tests, and `docker compose build`.
No `.env` file is required in CI — secrets are injected via workflow `env`.

## Workflow

- `main` is protected — work on feature branches and open pull requests.
- Backend API contract is documented via Swagger at `/api/docs`.
- Database schema lives in `apps/backend/prisma/schema.prisma`; run `pnpm exec prisma migrate dev` after changes.
