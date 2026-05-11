# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------
# Stage 1: base — pnpm via corepack
# ------------------------------------------------------------------
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
WORKDIR /app

# ------------------------------------------------------------------
# Stage 2: build — install deps + Vite build
# ------------------------------------------------------------------
FROM base AS build
COPY package.json pnpm-lock.yaml* .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm build

# ------------------------------------------------------------------
# Stage 3: runtime — nginx serving dist/
# ------------------------------------------------------------------
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
