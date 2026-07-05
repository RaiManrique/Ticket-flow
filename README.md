# TicketFlow — Arquitectura de 3 Capas

Plataforma **social de eventos** en el Perú. Proyecto académico UPC (Sistemas Operativos) con arquitectura de tres niveles desplegada en Docker.

## Arquitectura completa

```text
┌──────────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACION                                        │
│  TicketFlow-Web (Angular 19 + Nginx) — http://127.0.0.1:8090 │
│  Login, eventos, asistencia, comunidad, panel admin │
└────────────────────────────┬─────────────────────────────────┘
                             │ /api/*
┌────────────────────────────▼─────────────────────────────────┐
│  CAPA DE APLICACION                                          │
│  TicketFlow-API (Node.js + Express) — http://127.0.0.1:3000  │
│  REST API: auth JWT, eventos, asistencia, social, upload, admin │
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

## Guia paso a paso (lee esto primero)

Si es la primera vez o te sale **"API no disponible"**, sigue estos pasos **en orden**. No saltes ninguno.

### Antes de empezar — checklist

- [ ] Tienes el repo clonado en tu PC (ej. `C:\Users\User\Documents\GitHub\Ticket-flow`)
- [ ] **Docker Desktop esta abierto** y dice *Running* (no solo instalado)
- [ ] Tienes **Node.js 20+** si vas a usar `npm start` (modo desarrollo)
- [ ] Sabes en que carpeta estas: los comandos `docker compose` se ejecutan desde la **raiz** del proyecto (`Ticket-flow`), no desde `frontend-angular`

### Elige UN modo de uso

| Modo | Para quien | URL final | Que levantas |
|------|------------|-----------|--------------|
| **A — Docker completo** | Demo, entrega, sin tocar codigo Angular | http://127.0.0.1:8090 | Todo con Docker |
| **B — Desarrollo Angular** | Programar el frontend con recarga en vivo | http://localhost:4200 | Docker (mongo+api) + `npm start` |

**No mezcles las URLs:** si usas `npm start`, entra en **:4200**. Si usas solo Docker, entra en **:8090**.

---

### Modo A — Docker completo (mas simple)

**Paso 1.** Abre **Docker Desktop** y espera a que este en *Running*.

**Paso 2.** Abre PowerShell o Git Bash y ve a la raiz del proyecto:

```powershell
cd C:\Users\User\Documents\GitHub\Ticket-flow
```

(Ajusta la ruta si clonaste en otro sitio.)

**Paso 3.** Levanta las 3 capas (primera vez tarda varios minutos):

```powershell
docker compose up -d --build
```

**Paso 4.** Verifica que los 3 contenedores esten *Up*:

```powershell
docker compose ps
```

Debes ver: `TicketFlow-Mongo`, `TicketFlow-API`, `TicketFlow-Web`.

**Paso 5.** Prueba la API en el navegador o terminal:

```powershell
curl http://127.0.0.1:3000/api/health
```

Respuesta esperada: `"status":"ok"`.

**Paso 6.** Abre el navegador en:

**http://127.0.0.1:8090**

**Paso 7.** Inicia sesion con una cuenta demo o **crea la tuya** en `/registro`.

| Usuario | Contrasena |
|---------|------------|
| `rai_manrique` | `TicketFlow2026` |

Cuenta nueva: http://127.0.0.1:8090/registro (solo fans; rol `usuario`).

---

### Modo B — Desarrollo Angular (`ng serve`)

Usa este modo si vas a **editar el frontend** en `frontend-angular/`.

**Paso 1.** Abre **Docker Desktop** (*Running*).

**Paso 2.** Terminal 1 — raiz del proyecto, solo datos + API:

```powershell
cd C:\Users\User\Documents\GitHub\Ticket-flow
docker compose up -d mongo api
```

**Paso 3.** Comprueba la API (obligatorio antes de abrir Angular):

```powershell
curl http://127.0.0.1:3000/api/health
```

Si falla, **no sigas**: revisa la seccion [Problemas frecuentes](#problemas-frecuentes).

**Paso 4.** Terminal 2 — frontend Angular:

```powershell
cd C:\Users\User\Documents\GitHub\Ticket-flow\frontend-angular
npm install
npm start
```

Espera el mensaje: `Local: http://localhost:4200/`

**Paso 5.** Abre el navegador en:

**http://localhost:4200**

(No uses :8090 en este modo.)

**Paso 6.** Login con `rai_manrique` / `TicketFlow2026`.

> **Importante:** usa `npm start` (incluye proxy a la API). Si corres solo `ng serve` sin proxy, el login puede fallar. El proxy ya esta en `angular.json`, pero `npm start` es lo mas seguro.

**Paso 7.** Si cambias codigo del frontend, la pagina se recarga sola. Si cambias el **backend**, reconstruye la API:

```powershell
cd C:\Users\User\Documents\GitHub\Ticket-flow
docker compose up -d --build api
```

---

### Compilar Angular a mano (build de produccion)

Solo si necesitas generar los archivos estaticos:

```powershell
cd frontend-angular
npm install
npm run build
```

Salida: `frontend-angular/dist/ticketflow-web/browser/`

Para servirlos con nginx en Docker:

```powershell
cd ..
docker compose up -d --build web
```

---

### Problemas frecuentes

| Error o sintoma | Causa habitual | Solucion |
|-----------------|----------------|----------|
| `API no disponible` en el login | Docker cerrado o API no levantada | Abre Docker Desktop → `docker compose up -d mongo api` → reinicia `npm start` |
| `dockerDesktopLinuxEngine` / `cannot find the file` | Docker Desktop no esta corriendo | Abre Docker Desktop y espera *Running* |
| `ECONNREFUSED 127.0.0.1:8090` en la terminal de `ng serve` | Proxy viejo o sin API | Usa `npm start`; el proxy apunta a la API en **:3000**. Levanta `docker compose up -d mongo api` |
| Login no hace nada en **:4200** | Entraste sin API arriba | `curl http://127.0.0.1:3000/api/health` debe responder `ok` |
| **Registro no guarda** / error al crear cuenta | API vieja sin `/register` | `docker compose up -d --build api` y recarga la pagina |
| **502 Bad Gateway** en **:8090** | Contenedor web desconectado de la API | `docker compose up -d --force-recreate` |
| `cd Ticket-flow: No such file` | Ya estas dentro del repo | Usa `cd` a la ruta real, ej. `cd Documents/GitHub/Ticket-flow` |
| `npm run dev` en `frontend-angular` falla | Ese script no existe ahi | En frontend: `npm start`. En backend: `cd backend` → `npm run dev` |
| Contraseña incorrecta | Typo o `.env` distinto | Default: `TicketFlow2026` para todas las cuentas demo |

**Secuencia de rescate rapida** (cuando nada funciona):

```powershell
# 1. Desde la raiz del proyecto
docker compose down
docker compose up -d --build

# 2. Espera 30 segundos y verifica
docker compose ps
curl http://127.0.0.1:3000/api/health

# 3. Modo desarrollo: reinicia Angular
cd frontend-angular
npm start
```

---

## Compilar y ejecutar (Docker — referencia rapida)

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

| Servicio | URL / Puerto | Contenedor | Bind (Docker) |
|----------|--------------|------------|---------------|
| **Web** (Angular + proxy `/api`) | http://127.0.0.1:8090 | TicketFlow-Web | `0.0.0.0:8090` (accesible en LAN) |
| **API** (directa, Postman) | http://127.0.0.1:3000/api/health | TicketFlow-API | `0.0.0.0:3000` |
| **MongoDB** | 127.0.0.1:27018 | TicketFlow-Mongo | `127.0.0.1:27018` (solo local) |

Mongo queda en **127.0.0.1** a propósito: la API se conecta por la red interna Docker (`mongo:27017`). Web y API escuchan en **todas las interfaces** (`0.0.0.0`) para Postman y otras PCs en la red. Variables en `.env`: `WEB_BIND_IP`, `API_BIND_IP`, `MONGO_BIND_IP`.

### Como funciona el token JWT (importante)

**No creas el token a mano.** La API lo genera cuando inicias sesion o te registras.

| Paso | Que haces | Que devuelve la API |
|------|-----------|---------------------|
| 1 | `POST /api/auth/login` con usuario y contrasena | JSON con campo `"token": "eyJhbG..."` |
| 2 | Copias ese valor (o Postman lo guarda en `{{token}}`) | — |
| 3 | En rutas protegidas envias el header | `Authorization: Bearer eyJhbG...` |

El token es una cadena larga con **3 partes separadas por puntos** (formato JWT), por ejemplo:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjBhMDAxMDAwMDAwMDAwMDAwMDA0Iiwicm9sIjoidXN1YXJpbyIsInVzZXJuYW1lIjoicmFpX21hbnJpcXVlIiwiaWF0IjoxNzM... .signature...
```

En Postman la variable `token` empieza **vacia** hasta que ejecutas **Login**. Eso es normal.

#### Obtener token (Postman o curl)

**Postman:** carpeta `01 - Auth` → **Login usuario (rai_manrique)** → Send.  
El script de prueba guarda automaticamente el token en el entorno **TicketFlow Local**.

**PowerShell (ver token en consola):**

```powershell
$body = '{"login":"rai_manrique","password":"TicketFlow2026"}'
$r = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$r.token          # copia esto para Bearer
$r.user.username  # rai_manrique
```

#### Validar que el token funciona

```http
GET http://127.0.0.1:3000/api/auth/me
Authorization: Bearer PEGA_AQUI_EL_TOKEN_DEL_LOGIN
```

Respuesta esperada (`200`): datos del usuario (`username`, `rol`, etc.).  
Si falta el header o el token expiro: `401` con `"Sesion invalida o expirada"`.

#### Que valida la API (`requireAuth`)

1. Header `Authorization: Bearer <token>` presente y formato JWT valido
2. Firma correcta (`JWT_SECRET` en `.env` del contenedor `api`)
3. Token no expirado (default **24 h**, variable `JWT_EXPIRES`)
4. Usuario existe en MongoDB

Rutas **sin token** (publicas): `GET /api/health`, `GET /api/eventos`, `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/demo/login-info`.

Rutas **con token usuario**: `POST /api/eventos/:id/asistir`, `GET /api/auth/me`, `POST /api/social/publicaciones`, `POST /api/upload`, etc.

Rutas **token organizador/admin**: `/api/admin/*` (organizador ve solo sus datos; admin ve todo).

### Postman (API)

Puedes llamar la API de dos formas:

| Modo | Base URL | Ejemplo |
|------|----------|---------|
| **Directo** (recomendado) | `http://127.0.0.1:3000/api` | `GET /health` → `http://127.0.0.1:3000/api/health` |
| **Via web** (nginx proxy) | `http://127.0.0.1:8090/api` | `POST /auth/login` → `http://127.0.0.1:8090/api/auth/login` |

Login de prueba:

```http
POST http://127.0.0.1:3000/api/auth/login
Content-Type: application/json

{"login": "rai_manrique", "password": "TicketFlow2026"}
```

Rutas protegidas: header `Authorization: Bearer <token>`.

Desde otra PC en la misma red, cambia `127.0.0.1` por la IP de tu equipo (ej. `http://192.168.1.50:3000/api/health`).

Tras cambiar puertos o bind en `.env`:

```powershell
docker compose up -d --force-recreate web api
```

### Coleccion Postman (pruebas completas)

En la carpeta `postman/` del repo:

| Archivo | Uso |
|---------|-----|
| `TicketFlow-API.postman_collection.json` | Todas las rutas (auth, eventos, asistencia, social, admin, upload) |
| `TicketFlow-Local.postman_environment.json` | Variables: `base_url`, `token`, IDs demo |

**Importar en Postman:** File → Import → selecciona ambos JSON. Activa el entorno **TicketFlow Local**.

**Orden sugerido de pruebas:**

1. Activa el entorno **TicketFlow Local** (esquina superior derecha en Postman).
2. `00 - Health` → Health check (`mongo: connected`).
3. `01 - Auth` → **Login usuario** → Send (**obligatorio antes de rutas protegidas**).
4. `01 - Auth` → **Verificar token (GET /me)** → debe dar `200`.
5. `02 - Eventos` → Listar y detalle.
6. `03 - Asistencia` → Confirmar asistencia a un evento.
7. Para admin: **Login organizador** o **Login admin**, luego carpeta `05 - Admin`.

Si `{{token}}` esta vacio y llamas rutas con auth, recibiras **401**. Vuelve al paso 3.

Variables del entorno:

| Variable | Valor inicial | Descripcion |
|----------|---------------|-------------|
| `base_url` | `http://127.0.0.1:3000/api` | URL directa API |
| `base_url_web` | `http://127.0.0.1:8090/api` | Via nginx |
| `demo_password` | `TicketFlow2026` | Contrasena cuentas demo |
| `token` | *(vacio)* | Se llena sola al hacer Login |
| `evento_id` | ID teatro demo | Se actualiza al listar eventos |

### Iniciar sesión

Abre: **http://127.0.0.1:8090**

| Cuenta demo | Contraseña | Vista |
|-------------|------------|-------|
| `rai_manrique` | `TicketFlow2026` | Usuario — eventos, favoritos, asistencia, comunidad |
| `victor_arapa` | `TicketFlow2026` | Organizador — panel de eventos |
| `admin_ticketflow` | `TicketFlow2026` | Admin — panel administrador |

Rutas Angular según rol:

| Rol | Ruta |
|-----|------|
| Usuario | `/usuario/inicio` |
| Admin / Organizador | `/admin` |

> Si el login falla con **502**, recrea los contenedores en la misma red:
> `docker compose up -d --force-recreate`

> Si el login falla con **502**, recrea los contenedores:
> `docker compose up -d --force-recreate`

---

## Desarrollo local (referencia rapida)

Resumen del [Modo B](#modo-b--desarrollo-angular-ng-serve) de la guia paso a paso:

```powershell
# Terminal 1 — raiz del proyecto
docker compose up -d mongo api
curl http://127.0.0.1:3000/api/health

# Terminal 2
cd frontend-angular
npm install
npm start
# Abrir http://localhost:4200
```

### Backend sin Docker (opcional avanzado)

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

### Rutas por módulo

| Módulo | Prefijo | Responsabilidad |
|--------|---------|-----------------|
| Auth | `/api/auth` | Login, registro, JWT, perfil |
| Eventos | `/api/eventos` | Catálogo público y asistencia |
| Social | `/api/social` | Publicaciones, likes y comentarios |
| Upload | `/api/upload` | Media optimizada (DigitalOcean Spaces) |
| Admin | `/api/admin` | Dashboard, eventos staff, usuarios (solo admin) |

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/login` | Login (JWT) |
| POST | `/api/auth/register` | Crear cuenta **solo rol usuario** |
| GET | `/api/auth/me` | Usuario en sesión |
| GET | `/api/eventos` | Listar eventos |
| GET | `/api/eventos/:id/detalle` | Detalle del evento |
| POST | `/api/eventos/:id/asistir` | Confirmar / quitar asistencia (auth) |
| POST | `/api/upload` | Subir imagen o video (auth) |
| GET | `/api/social/publicaciones` | Feed social |
| POST | `/api/social/publicaciones/:id/like` | Like / unlike |
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
| `WEB_BIND_IP` | Interfaz del puerto web (default `0.0.0.0`; Postman/LAN) |
| `API_BIND_IP` | Interfaz del puerto API (default `0.0.0.0`) |
| `MONGO_BIND_IP` | Interfaz Mongo (default `127.0.0.1`, solo local) |
| `CORS_ORIGINS` | Origenes permitidos (incluye `:4200` para ng serve) |
| `DO_SPACES_*` | Credenciales DigitalOcean Spaces para media |

---

## Colecciones (capa de datos)

| Colección | Uso |
|-----------|-----|
| `usuarios` | Perfiles y roles |
| `eventos` | Catálogo con geolocalización y asistentes |
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
