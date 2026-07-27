FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN cd apps/backend && pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN cd apps/backend && pnpm exec prisma generate && pnpm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main.js"]
