ARG NODE_VERSION=24.22.2

# ---- Build stage ----
FROM node:${NODE_VERSION}-alpine AS build
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app

# Install deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

# ---- Runtime stage (Alpine) ----
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist          ./dist
COPY --chown=node:node src/database/migrations ./src/database/migrations
COPY --chown=node:node public ./public
USER node
CMD ["node", "dist/main.js"]