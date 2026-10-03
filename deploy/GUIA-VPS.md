# Gokron en un VPS (Docker)

Todo corre con `docker compose`: base de datos (PostgreSQL), backend y panel
web (Caddy, con HTTPS automatico). Esta guia asume Ubuntu con Docker instalado.

## 1. Conectarte al servidor

Desde tu PC: `ssh root@IP-DEL-SERVIDOR` (Hostinger te da la IP y la clave).

## 2. Descargar el proyecto

```bash
git clone https://github.com/jhoncampos032-prog/GOKRON.git
cd GOKRON
```

## 3. Crear el archivo de configuracion

```bash
cp .env.example .env
nano .env
```

Rellena como minimo:

- `DB_PASSWORD`: genera una con `openssl rand -hex 24` (solo letras y numeros).
- `JWT_SECRET`: genera una con `openssl rand -hex 32`.
- `FRONTEND_URL`: `http://IP-DEL-SERVIDOR` por ahora; luego `https://tudominio.com`.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD`: para el correo de recuperar contrasena.
- `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE`: para el Radio.

Deja `DOMINIO=:80` mientras no tengas dominio.

## 4. Firewall (solo SSH, web y HTTPS)

```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
```

## 5. Levantar el sistema

```bash
docker compose up -d --build
docker compose ps        # los 3 deben estar "Up" / "healthy"
```

La primera vez crea la base de datos vacia. Abre `http://IP-DEL-SERVIDOR`.

## 6. Traer tus datos de Supabase (una sola vez)

```bash
SUPABASE_URL='postgresql://...tu cadena de conexion de Supabase...' bash deploy/migrar-datos-supabase.sh
rm datos-supabase.sql
```

Debe mostrar el resumen (empresas, usuarios, obras). No lo repitas si la base
ya tiene datos.

## 7. Dominio y HTTPS

1. En tu proveedor de dominio crea un registro **A** que apunte a la IP del VPS.
2. En `.env`: `DOMINIO=tudominio.com` y `FRONTEND_URL=https://tudominio.com`.
3. `docker compose up -d` (Caddy consigue el certificado solo).

## 8. Apuntar las apps a tu servidor

- **App movil:** en `mobile/src/api/cliente.js` cambia `API_URL` por
  `https://tudominio.com/api` y genera un build nuevo (EAS).
- **Google Drive (si lo usas):** actualiza `GOOGLE_REDIRECT_URI` en `.env` y en
  la consola de Google Cloud a `https://tudominio.com/api/auth/google-drive/callback`.

## 9. Copias de seguridad diarias

```bash
chmod +x deploy/backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * $(pwd)/deploy/backup.sh") | crontab -
```

Guarda tambien una copia fuera del servidor de vez en cuando (por ejemplo,
bajandola a tu PC con `scp`).

## Actualizar a una version nueva

```bash
git pull
docker compose up -d --build
```

Las migraciones pendientes se aplican solas al arrancar.

## Comandos utiles

```bash
docker compose logs -f backend     # ver el registro del backend
docker compose restart backend     # reiniciar solo el backend
docker compose down                # apagar (los datos se conservan)
```

**Nunca** uses `docker compose down -v`: borra la base de datos.
