# TicketFlow — Arquitectura de 3 Capas

Plataforma de **venta de boletos** y **red social de eventos** en el Perú. Proyecto académico UPC (Sistemas Operativos) con arquitectura de tres niveles desplegada en Docker.

## Arquitectura completa

```text
┌──────────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACION                                        │
│  TicketFlow-Web (Nginx) — http://127.0.0.1:8090              │
│  HTML/CSS/JS: eventos, compra de boletos, feed social        │
└────────────────────────────┬─────────────────────────────────┘
                             │ /api/*
┌────────────────────────────▼─────────────────────────────────┐
│  CAPA DE APLICACION                                          │
│  TicketFlow-API (Node.js + Express) — http://127.0.0.1:3000  │
│  REST API: eventos, ventas, publicaciones                    │
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

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución
- Git

## Inicio rápido

Clona el repo, levanta Docker y prueba todo (web, API y MongoDB en **127.0.0.1:27018**):

```powershell
git clone <url-del-repositorio> Ticket-flow
cd Ticket-flow
docker compose up -d --build
```

La primera vez crea la carpeta `BD/`, ejecuta `init-mongo.js` (esquema + datos demo) y `z-init-app-user.sh` (usuario de aplicacion).

Opcional: copia `.env.example` a `.env` si quieres cambiar contraseñas o puertos.

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
| **Web** (presentación) | http://127.0.0.1:8090 | TicketFlow-Web |
| **API** (aplicación) | http://127.0.0.1:3000/api/health | TicketFlow-API |
| **MongoDB** (datos) | 127.0.0.1:27018 | TicketFlow-Mongo |

Probar MongoDB desde tu PC (credenciales por defecto si no usas `.env`):

```powershell
docker exec -it TicketFlow-Mongo mongosh -u ticketflow_admin -p "TicketFlow2026DevMongo!" --authenticationDatabase admin ticketflow_social
```

### Iniciar sesion (dos vistas)

Abre: **http://127.0.0.1:8090**

| Cuenta demo | Contrasena | Vista |
|-------------|------------|-------|
| `rai_manrique` | `TicketFlow2026` | **Usuario** — eventos, compra, comunidad |
| `victor_arapa` | `TicketFlow2026` | **Admin** — panel organizador |
| `admin_ticketflow` | `TicketFlow2026` | **Admin** — panel administrador |

Segun el rol, se redirige automaticamente a:
- **Usuario:** `/usuario.html`
- **Admin / Organizador:** `/admin.html`

## API (capa de aplicación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/eventos` | Listar eventos publicados |
| GET | `/api/eventos/:id` | Detalle de un evento |
| GET | `/api/eventos/:id/boletos` | Boletos de un evento |
| POST | `/api/ventas` | Registrar compra de boletos |
| GET | `/api/social/publicaciones` | Feed de la comunidad |
| GET | `/api/social/usuarios` | Usuarios de la plataforma |

Ejemplo de compra:

```json
POST /api/ventas
{
  "usuario_id": "64f0a0010000000000000004",
  "evento_id": "64f0b0010000000000000001",
  "boletos_ids": ["..."],
  "metodo_pago": "yape"
}
```

## Seguridad

| Rol | Usuario | Acceso |
|-----|---------|--------|
| **Admin** | `MONGO_ROOT_USER` | Mantenimiento, mongosh (puerto 27018) |
| **Aplicación** | `MONGO_APP_USER` | Solo `readWrite` en `ticketflow_social` |

La API se conecta a MongoDB por la **red interna Docker** (`mongo:27017`), no expone credenciales al navegador.

Variables en `.env`:

| Variable | Descripción |
|----------|-------------|
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | Admin MongoDB |
| `MONGO_APP_USER` / `MONGO_APP_PASSWORD` | Usuario del backend |
| `MONGO_BIND_IP` | IP permitida para MongoDB (`127.0.0.1` = solo esta PC) |
| `API_PORT` | Puerto de la API (default `3000`) |
| `WEB_PORT` | Puerto del frontend (default `8090`; evita `8080` reservado para DomotiCore) |

## Estructura del proyecto

```text
Ticket-flow/
├── frontend/            # Capa de presentacion (HTML, CSS, JS)
├── backend/             # Capa de aplicacion (Node.js + Express)
├── docker-compose.yml   # Orquestacion de las 3 capas
├── init-mongo.js        # Esquema e indices MongoDB
├── seed-data.js         # Datos de ejemplo
├── z-init-app-user.sh   # Usuario de app con permisos limitados
├── .env.example
└── README.md
```

## Colecciones (capa de datos)

| Colección | Uso |
|-----------|-----|
| `usuarios` | Perfiles y roles |
| `eventos` | Catálogo con geolocalización |
| `boletos` | Inventario de entradas |
| `ventas` | Registro de compras |
| `publicaciones` | Feed social |
| `comentarios` | Interacciones |
| `follows` | Seguidores |

## Comandos útiles

```powershell
# Ver logs de cada capa
docker logs TicketFlow-Web
docker logs TicketFlow-API
docker logs TicketFlow-Mongo

# Detener todo
docker compose down

# Reconstruir tras cambios en backend
docker compose up -d --build api

# Recargar datos de ejemplo
docker cp seed-data.js TicketFlow-Mongo:/tmp/seed-data.js
docker exec TicketFlow-Mongo mongosh -u ticket-flow -p "TU_PASSWORD" --authenticationDatabase admin /tmp/seed-data.js

# mongosh (admin)
docker exec -it TicketFlow-Mongo mongosh -u ticket-flow -p "TU_PASSWORD" --authenticationDatabase admin ticketflow_social
```

## Desarrollo local sin Docker (opcional)

```powershell
# Solo API (con MongoDB ya corriendo en Docker)
cd backend
npm install
$env:MONGO_HOST="127.0.0.1"
$env:MONGO_INTERNAL_PORT="27018"
$env:MONGO_ROOT_USER="ticket-flow"
$env:MONGO_ROOT_PASSWORD="TU_PASSWORD"
npm run dev
```

## Equipo

| Código | Integrante |
|--------|------------|
| u202412310 | Victor Piero Arapa Titi |
| u202417405 | Cesar Augusto Quispe Llacsahuanga |
| u20241e410 | Rai Jeferson Manrique Anaya |

**Curso:** Sistemas Operativos — UPC — Sección 11539
