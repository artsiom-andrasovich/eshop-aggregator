FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter backend exec prisma generate \
 && pnpm --filter shared run build \
 && pnpm --filter backend run build \
 && pnpm deploy --filter backend --prod --legacy /out

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /out /app
RUN ./node_modules/.bin/prisma generate
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
