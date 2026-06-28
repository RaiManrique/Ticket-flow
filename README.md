# TicketFlow — Arquitectura de 3 Capas

Plataforma de **venta de boletos** y **red social de eventos** en el Perú. Proyecto académico UPC (Sistemas Operativos) con arquitectura de tres niveles desplegada en Docker.

## Arquitectura completa

```text
┌──────────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACION                                        │
│  TicketFlow-Web (Angular 19 + Nginx) — http://127.0.0.1:8090 │
│  Login, eventos, checkout, billetera, comunidad, panel admin │
└────────────────────────────┬─────────────────────────────────┘
                             │ /api/*
┌────────────────────────────▼─────────────────────────────────┐
│  CAPA DE APLICACION                                          │
│  TicketFlow-API (Node.js + Express) — http://127.0.0.1:3000  │
│  REST API: auth JWT, eventos, ventas, reembolsos, social    │
└────────────────────────────┬─────────────────────────────────┘
                             │ mongo:27017 (red interna)
┌────────────────────────────▼─────────────────────────────────┐
│  CAPA DE DATOS                                               │
│  TicketFlow-Mongo (MongoDB 8.3) — 127.0.0.1:27018            │
│  Base: ticketflow_social (documentos NoSQL)                  │
└──────────────────────────────────────────────────────────────┘
         Red Docker aislada: ticketflow-data
```

## Requisitos

| Modo | Necesitas |
|------|-----------|
| **Docker (recomendado)** | [Docker Desktop](https://www.docker.com/products/docker-desktop/) + Git |
| **Desarrollo Angular local** | Node.js 20+ y npm, además de Docker para Mongo/API |

---

## Compilar y ejecutar (Docker — recomendado)

Levanta las **3 capas** (Mongo, API y frontend Angular compilado):

```powershell
git clone <url-del-repositorio> Ticket-flow
cd Ticket-flow
docker compose up -d --build
```

La primera vez crea la carpeta `BD/`, ejecuta `init-mongo.js` (esquema + datos demo) y `z-init-app-user.sh`.

Opcional — personalizar contraseñas o puertos:

```powershell
Copy-Item .env.example .env
notepad .env
```

### Verificar servicios

```powershell
docker compose ps
```

| Servicio | URL / Puerto | Contenedor |
|----------|--------------|------------|
| **Web** (Angular) | http://127.0.0.1:8090 | TicketFlow-Web |
| **API** | http://127.0.0.1:3000/api/health | TicketFlow-API |
| **MongoDB** | 127.0.0.1:27018 | TicketFlow-Mongo |

### Iniciar sesión

Abre: **http://127.0.0.1:8090**

| Cuenta demo | Contraseña | Vista |
|-------------|------------|-------|
| `rai_manrique` | `TicketFlow2026` | Usuario — eventos, compra, billetera, comunidad |
| `victor_arapa` | `TicketFlow2026` | Admin — panel organizador |
| `admin_ticketflow` | `TicketFlow2026` | Admin — panel administrador |

Rutas Angular según rol:

| Rol | Ruta |
|-----|------|
| Usuario | `/usuario/inicio` |
| Admin / Organizador | `/admin` |

> Si el login falla con **502**, recrea los contenedores en la misma red:
> `docker compose up -d --force-recreate`

---

## Compilar y ejecutar (desarrollo local)

### 1. Backend + MongoDB (Docker)

```powershell
docker compose up -d mongo api
```

### 2. Frontend Angular (modo desarrollo)

```powershell
cd frontend-angular
npm install
npm start
```

Abre **http://localhost:4200** — el proxy redirige `/api` al stack Docker (puerto 8090 o API directa según `proxy.conf.json`).

### 3. Compilar Angular para producción (sin Docker web)

```powershell
cd frontend-angular
npm install
npm run build
```

Salida en: `frontend-angular/dist/ticketflow-web/browser/`

Para servir ese build localmente necesitas un servidor estático con proxy a la API, o usar Docker:

```powershell
cd ..
docker compose up -d --build web
```

### 4. Backend sin Docker (opcional)

Con MongoDB ya corriendo en Docker (`127.0.0.1:27018`):

```powershell
cd backend
npm install
$env:MONGO_HOST="127.0.0.1"
$env:MONGO_INTERNAL_PORT="27018"
$env:MONGO_ROOT_USER="ticketflow_admin"
$env:MONGO_ROOT_PASSWORD="TicketFlow2026DevMongo!"
$env:DEMO_USER_PASSWORD="TicketFlow2026"
npm run dev
```

Health check manual de la API:

```powershell
cd backend
npm run health
```

---

## Comandos útiles

```powershell
# Logs por capa
docker logs TicketFlow-Web
docker logs TicketFlow-API
docker logs TicketFlow-Mongo

# Detener todo
docker compose down

# Reconstruir solo API (tras cambios en backend)
docker compose up -d --build api

# Reconstruir solo frontend Angular (tras cambios en frontend-angular)
docker compose up -d --build web

# Reconstruir todo
docker compose up -d --build

# mongosh (admin)
docker exec -it TicketFlow-Mongo mongosh -u ticketflow_admin -p "TicketFlow2026DevMongo!" --authenticationDatabase admin ticketflow_social
```

### Resetear base de datos

```powershell
docker compose down
Remove-Item -Recurse -Force BD
docker compose up -d --build
```

---

## API (capa de aplicación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/login` | Login (JWT) |
| GET | `/api/auth/me` | Usuario en sesión |
| GET | `/api/eventos` | Listar eventos |
| GET | `/api/eventos/:id/detalle` | Detalle + zonas/precios |
| GET | `/api/eventos/:id/boletos` | Boletos disponibles |
| POST | `/api/ventas` | Comprar (requiere auth) |
| GET | `/api/ventas/mis-boletos` | Billetera del usuario |
| POST | `/api/ventas/reembolso` | Solicitar reembolso |
| GET | `/api/politicas` | Condiciones de compra/reembolso |
| GET | `/api/social/publicaciones` | Feed social |
| GET | `/api/admin/dashboard` | Métricas (staff) |

---

## Estructura del proyecto

```text
Ticket-flow/
├── frontend-angular/    # Capa de presentacion (Angular 19)
│   ├── src/app/         # componentes, servicios, guards
│   ├── public/img/      # assets estaticos
│   ├── Dockerfile       # build Angular + nginx
│   └── nginx.conf       # proxy /api → TicketFlow-API
├── backend/             # Capa de aplicacion (Node.js + Express)
├── frontend/            # (legacy) HTML/JS antiguo — ya no usa Docker
├── docker-compose.yml   # Orquestacion de las 3 capas
├── init-mongo.js        # Esquema e indices MongoDB
├── seed-data.js         # Datos de ejemplo
├── z-init-app-user.sh   # Usuario de app con permisos limitados
├── .env.example
└── README.md
```

---

## Seguridad

| Rol | Usuario | Acceso |
|-----|---------|--------|
| **Admin** | `MONGO_ROOT_USER` | Mantenimiento, mongosh (puerto 27018) |
| **Aplicación** | `MONGO_APP_USER` | Solo `readWrite` en `ticketflow_social` |

La API se conecta a MongoDB por la **red interna Docker** (`mongo:27017`). El frontend usa JWT en `Authorization: Bearer`.

Variables principales en `.env`:

| Variable | Descripción |
|----------|-------------|
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | Admin MongoDB |
| `DEMO_USER_PASSWORD` | Contraseña cuentas demo |
| `JWT_SECRET` | Firma de tokens |
| `WEB_PORT` | Puerto web (default `8090`) |
| `API_PORT` | Puerto API (default `3000`) |
| `CORS_ORIGINS` | Origenes permitidos (incluye `:4200` para ng serve) |

---

## Colecciones (capa de datos)

| Colección | Uso |
|-----------|-----|
| `usuarios` | Perfiles y roles |
| `eventos` | Catálogo con geolocalización |
| `boletos` | Inventario de entradas |
| `ventas` | Registro de compras |
| `reembolsos` | Solicitudes de reembolso |
| `publicaciones` | Feed social |
| `comentarios` | Interacciones |
| `follows` | Seguidores |

---

## Equipo

| Código | Integrante |
|--------|------------|
| u202412310 | Victor Piero Arapa Titi |
| u202417405 | Cesar Augusto Quispe Llacsahuanga |
| u20241e410 | Rai Jeferson Manrique Anaya |

**Curso:** Sistemas Operativos — UPC — Sección 11539
