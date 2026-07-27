# E-Shop Aggregator

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

## Getting started

```bash
pnpm install

# start Postgres only
docker compose up -d postgres

# backend
cp apps/backend/.env.example apps/backend/.env
cd apps/backend
pnpm exec prisma migrate dev
pnpm run start:dev   # http://localhost:3000, Swagger at /api/docs

# frontend (separate terminal)
cd apps/frontend
cp .env.example .env
pnpm run dev          # http://localhost:5173
```

## Full stack via Docker

```bash
docker compose up --build
```

## Workflow

- `main` is protected — work on feature branches and open pull requests.
- Backend API contract is documented via Swagger at `/api/docs`.
- Database schema lives in `apps/backend/prisma/schema.prisma`; run `pnpm exec prisma migrate dev` after changes.
