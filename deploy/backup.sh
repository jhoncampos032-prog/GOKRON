#!/usr/bin/env bash
# Copia de seguridad de la base de datos de Gokron (se guarda comprimida y se
# borran las de mas de 14 dias). Se programa con cron, ver GUIA-VPS.md.
set -euo pipefail

CARPETA="${HOME}/backups-gokron"
mkdir -p "$CARPETA"
cd "$(dirname "$0")/.."

docker compose exec -T db pg_dump -U gokron -d gokron --no-owner | gzip > "$CARPETA/gokron-$(date +%Y%m%d-%H%M).sql.gz"
find "$CARPETA" -name 'gokron-*.sql.gz' -mtime +14 -delete
echo "Copia guardada en $CARPETA"
