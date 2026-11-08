ARG NODE_VERSION=24.22.2

FROM node:${NODE_VERSION}-bookworm-slim AS build
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

FROM node:${NODE_VERSION}-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node src/database/migrations ./src/database/migrations
COPY --chown=node:node public ./public
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
