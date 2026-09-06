# Sistema de gestión digital para constructoras

App para digitalizar y automatizar la gestión de personal, obras, materiales
y tareas en empresas de construcción con muchos trabajadores.

## Identidad visual

Paleta definida a partir de referencia del cliente:

| Color | Hex | Uso |
|---|---|---|
| Marino oscuro | `#131321` | Fondo de navegación, texto principal, header |
| Menta | `#46F0D2` | Acento principal — botones de acción, estados positivos, marca |
| Crema | `#FBE2B4` | Acento secundario — estados neutros/pendientes |
| Blanco | `#FFFFFF` | Fondo de contenido y tarjetas |
| Ladrillo (utilitario) | `#B23A2E` | Alertas reales (stock bajo, obra pausada) — se mantiene fuera de la paleta de marca porque una alerta necesita leerse como alerta |

Aplicada de forma consistente en el panel web y en la app móvil.

## Arquitectura

- **Backend:** Node.js + Express + PostgreSQL (Prisma ORM). Multi-empresa:
  cada dato lleva `empresaId`, así el mismo sistema sirve para cualquier
  constructora que se sume después, sin reescribir nada.
- **Autenticación:** JWT con 3 roles: `ADMIN`, `SUPERVISOR`, `TRABAJADOR`.
- **Próximo:** Panel web (administración) y App móvil (obra), ambas consumen
  la misma API.

## Módulos ya construidos (Fase 1 — backend)

| Módulo | Qué resuelve | Endpoints |
|---|---|---|
| Autenticación y empresas | Alta de cada cliente/empresa, login | `POST /api/auth/registro-empresa`, `POST /api/auth/login` |
| Obras | Registrar y dar seguimiento a proyectos | `GET/POST /api/obras`, `PATCH /api/obras/:id/estado` |
| Asistencia | Control de quién está en obra y cuándo | `POST /api/asistencia/checkin`, `/checkout`, `GET /api/asistencia` |
| Materiales | Inventario y consumo por obra | `GET/POST /api/materiales`, `POST /api/materiales/:id/movimiento` |
| Tareas | Avance de obra con evidencia fotográfica | `GET/POST /api/tareas`, `PATCH /api/tareas/:id` |

## Cómo correrlo

```bash
cd backend
cp .env.example .env        # configura tu DATABASE_URL y JWT_SECRET
npm install
npx prisma migrate dev --name init   # crea las tablas en PostgreSQL
npm run dev
```

El servidor queda escuchando en `http://localhost:4000/api`.

### Probar rápido con curl

```bash
# 1. Registrar la empresa piloto + su administrador
curl -X POST http://localhost:4000/api/auth/registro-empresa \
  -H "Content-Type: application/json" \
  -d '{"nombreEmpresa":"Constructora Piloto","nombreAdmin":"Ana Admin","email":"ana@piloto.com","password":"123456"}'

# 2. Login (guarda el token que devuelve)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@piloto.com","password":"123456"}'

# 3. Crear una obra (usa el token del paso anterior)
curl -X POST http://localhost:4000/api/obras \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"nombre":"Edificio Central","direccion":"Av. Principal 123"}'
```

## Panel web (Fase 2)

React + Vite. Identidad visual propia (grafito/acero/ámbar de seguridad,
Archivo + IBM Plex) pensada para el mundo de la construcción, no una
plantilla genérica de SaaS.

```bash
cd frontend
cp .env.example .env    # apunta a tu backend (por defecto localhost:4000)
npm install
npm run dev
```

Se abre en `http://localhost:5173`. Incluye:

- **Login** con JWT contra el backend.
- **Resumen**: KPIs en vivo (obras en curso, personal en obra ahora, stock bajo, tareas pendientes).
- **Obras**: listado y alta de nuevas obras.
- **Personal y asistencia**: historial de check-in/check-out.
- **Materiales**: inventario con alerta visual de stock bajo.
- **Tareas**: seguimiento de avance por obra y responsable.

Compilación verificada con `npm run build` (sin errores).

## App móvil (Fase 3)

React Native + Expo. Misma identidad visual que el panel web. Pensada para
el trabajador en obra, con la limitación real del sector en mente: **mala
o nula señal en el sitio de trabajo**.

```bash
cd mobile
npm install
npx expo start
```

Escanea el código QR con la app **Expo Go** (Android/iOS) para probarla en
tu celular sin necesidad de compilar nada todavía.

Incluye:

- **Login** con el mismo backend y usuarios que el panel web.
- **Check-in / check-out geolocalizado con nota**: el trabajador elige su obra,
  marca entrada/salida con su ubicación GPS y puede dejar una nota corta
  (ej. "llegué con la cuadrilla completa"), igual que el flujo de Fingercheck
  pero integrado con el resto del sistema (obras, tareas, materiales).
- **Time Card**: pantalla de historial personal con horas trabajadas por día,
  entrada/salida y notas — el trabajador ve su propio registro sin depender
  de preguntarle a administración.
- **Modo sin señal**: si el check-in o el check-out fallan por falta de
  conexión (algo muy común en obra), se guardan en el dispositivo y se
  sincronizan automáticamente la próxima vez que la app detecte internet —
  esto es exactamente el problema que hace fallar a otras apps del sector.
- **Tareas**: el trabajador ve sus tareas asignadas y puede avanzarlas
  (pendiente → en progreso → completada) con el mismo respaldo sin señal.

Sintaxis de todos los archivos validada con esbuild (sin errores).

> Nota: antes de compilar para producción, cambia `API_URL` en
> `src/api/cliente.js` por la URL real de tu backend desplegado.

## Hoja de ruta

- [x] Fase 1 — Modelo de datos y backend (autenticación, obras, asistencia, materiales, tareas)
- [x] Fase 2 — Panel web de administración (dashboard, reportes en tiempo real)
- [x] Fase 3 — App móvil (check-in por GPS, modo sin señal, tareas)
- [ ] Fase 4 — Desplegar backend + base de datos real y probar con el cliente piloto
- [ ] Fase 5 — Preparación para venta: onboarding automático de nuevas empresas, planes de precio, documentación comercial

## Notas de seguridad para producción

- Cambiar `JWT_SECRET` por un valor largo y aleatorio antes de desplegar.
- Nunca commitear el archivo `.env` real.
- Agregar rate-limiting al login para evitar fuerza bruta.
- Las contraseñas ya se guardan hasheadas con bcrypt (nunca en texto plano).
