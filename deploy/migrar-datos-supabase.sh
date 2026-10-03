#!/usr/bin/env bash
# Copia los DATOS de Supabase a la base de datos de Docker.
#
# Antes: el sistema ya tiene que estar levantado (docker compose up -d) para
# que se haya creado el esquema vacio.
#
# Uso (desde la carpeta del proyecto, donde esta docker-compose.yml):
#   SUPABASE_URL='postgresql://usuario:clave@host:5432/postgres' bash deploy/migrar-datos-supabase.sh
#
# Es seguro repetirlo en una base vacia; no lo corras sobre una base que ya
# tiene datos reales, porque duplicaria los registros.
set -euo pipefail

: "${SUPABASE_URL:?Falta SUPABASE_URL (la cadena de conexion de Supabase)}"

ARCHIVO="datos-supabase.sql"

echo "1/3 Descargando los datos de Supabase..."
docker run --rm postgres:17-alpine pg_dump "$SUPABASE_URL" \
  --data-only --no-owner --no-privileges --schema=public \
  --exclude-table=public._prisma_migrations \
  --disable-triggers > "$ARCHIVO"

echo "2/3 Cargando los datos en la base de Docker..."
docker compose exec -T db psql -U gokron -d gokron -v ON_ERROR_STOP=1 -q < "$ARCHIVO"

echo "3/3 Resumen de lo copiado:"
docker compose exec -T db psql -U gokron -d gokron -t -c \
  "select 'empresas: ' || (select count(*) from \"Empresa\") || ', usuarios: ' || (select count(*) from \"Usuario\") || ', obras: ' || (select count(*) from \"Obra\");"

echo "Listo. Borra el archivo $ARCHIVO cuando termines (tiene datos y claves de tus usuarios)."
