# Etapa 1: compilar el panel web
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# El panel y la API salen del mismo dominio, asi que la API es "/api".
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: Caddy sirve el panel, reenvia /api al backend y saca el HTTPS solo
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
