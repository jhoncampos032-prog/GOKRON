FROM node:20-bookworm-slim

# Librerias del sistema que necesitan Prisma (openssl) y las graficas del
# Excel (canvas: cairo/pango/jpeg/gif/svg + una fuente).
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY scripts ./scripts
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Prepara la base de datos (crea el esquema si esta vacia, aplica migraciones
# pendientes) y arranca el servidor.
CMD ["sh", "-c", "node scripts/preparar-bd.js && node src/index.js"]
