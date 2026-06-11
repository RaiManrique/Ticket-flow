# TicketFlow — Capa de Datos

Plataforma tecnológica que integra **venta de boletos** y **red social de eventos** culturales y de entretenimiento en el Perú. Este repositorio contiene la **capa de datos** de la arquitectura de tres niveles del proyecto académico UPC (Sistemas Operativos).

## ¿Qué hace este repositorio?

Despliega **MongoDB 8.3** en un contenedor Docker y crea automáticamente la base de datos `ticketflow_social` con:

- Esquemas validados (JSON Schema)
- Índices para búsquedas, geolocalización y ventas
- Datos de ejemplo listos para pruebas y evidencias

## Arquitectura (capa de datos)

```text
┌─────────────────────────────────────────┐
│  Aplicación (futuro backend Node.js)    │
└──────────────────┬──────────────────────┘
                   │ puerto 27018 (localhost)
┌──────────────────▼──────────────────────┐
│  Docker: TicketFlow-Mongo               │
│  Imagen: mongo:8.3.3-noble              │
│  Red interna: ticketflow-data           │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  Base de datos: ticketflow_social       │
│  Colecciones documentales (NoSQL)       │
└─────────────────────────────────────────┘
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución
- Git (para clonar el repositorio)

## Inicio rápido

### 1. Clonar el proyecto

```powershell
git clone <url-del-repositorio> Ticket-flow
cd Ticket-flow
```

### 2. Levantar MongoDB

```powershell
docker compose up -d
```

La primera vez descargará la imagen `mongo:8.3.3-noble` y ejecutará `init-mongo.js`.

### 3. Verificar el servicio

```powershell
docker compose ps
```

Estado esperado: `Up (healthy)` en el puerto `127.0.0.1:27018`.

### 4. Conectarse a la base de datos

```powershell
docker exec -it TicketFlow-Mongo mongosh -u ticket-flow -p "Ticket_UPC_Flow_2026!" --authenticationDatabase admin ticketflow_social
```

Consultas útiles dentro de `mongosh`:

```javascript
show collections
db.usuarios.find().pretty()
db.eventos.find({ ciudad: "Lima" })
db.boletos.find({ estado: "disponible" })
db.ventas.find({ estado: "confirmada" })
```

## Credenciales

| Campo        | Valor                          |
|--------------|--------------------------------|
| Host         | `127.0.0.1`                    |
| Puerto       | `27018`                        |
| Usuario      | `ticket-flow`                  |
| Contraseña   | `Ticket_UPC_Flow_2026!`        |
| Base de datos| `ticketflow_social`            |
| Auth source  | `admin`                        |

### Cadena de conexión (Node.js / Mongoose)

```text
mongodb://ticket-flow:Ticket_UPC_Flow_2026!@127.0.0.1:27018/ticketflow_social?authSource=admin
```

## Colecciones

| Colección       | Descripción                                              |
|-----------------|----------------------------------------------------------|
| `usuarios`      | Perfiles, roles (`usuario`, `organizador`, `admin`)      |
| `eventos`       | Catálogo de eventos, ubicación geoespacial, asistentes   |
| `boletos`       | Inventario de entradas (disponible, reservado, vendido)  |
| `ventas`        | Registro transaccional de compras                        |
| `publicaciones` | Feed de la red social                                    |
| `comentarios`   | Interacciones en publicaciones                           |
| `follows`       | Relaciones de seguidores                                 |

## Datos de ejemplo incluidos

El script `init-mongo.js` carga datos de demostración:

- **7 usuarios**: admin, 2 organizadores (equipo UPC) y 4 usuarios
- **3 eventos** en Lima: megaconcierto, festival y teatro
- **8 boletos** en distintos estados (vendido, reservado, disponible)
- **3 ventas** confirmadas (tarjeta, Yape, Plin)
- **3 publicaciones**, **3 comentarios** y **5 follows**

## Estructura del proyecto

```text
Ticket-flow/
├── docker-compose.yml   # Orquestación del contenedor MongoDB
├── init-mongo.js        # Esquema, índices y datos de ejemplo (primera vez)
├── seed-data.js         # Recarga manual de datos de ejemplo
├── BD/                  # Volumen persistente (generado al ejecutar)
├── .gitignore
└── README.md
```

> La carpeta `BD/` se crea al iniciar Docker y **no se sube a Git** (contiene los datos locales).

## Comandos útiles

```powershell
# Ver logs del contenedor
docker logs TicketFlow-Mongo

# Detener el servicio
docker compose down

# Reiniciar el servicio
docker compose restart

# Recargar solo los datos de ejemplo (sin borrar el volumen)
docker cp seed-data.js TicketFlow-Mongo:/tmp/seed-data.js
docker exec TicketFlow-Mongo mongosh -u ticket-flow -p "Ticket_UPC_Flow_2026!" --authenticationDatabase admin /tmp/seed-data.js

# Reinicializar base de datos desde cero (borra todos los datos locales)
docker compose down
Remove-Item -Recurse -Force .\BD
docker compose up -d
```

> **Importante:** `init-mongo.js` solo se ejecuta cuando el volumen `BD/` está vacío (primera vez o después de borrarlo). Si necesitas recargar datos sin reiniciar todo, usa `seed-data.js`.

## Seguridad

- MongoDB solo se expone en `127.0.0.1:27018` (no accesible desde otras máquinas en la red)
- El contenedor opera en una red Docker interna (`ticketflow-data`)
- Las contraseñas de este README son para **desarrollo local**, no para producción

## Equipo

| Código      | Integrante                              |
|-------------|-----------------------------------------|
| u202412310  | Victor Piero Arapa Titi                 |
| u202417405  | Cesar Augusto Quispe Llacsahuanga       |
| u20241e410  | Rai Jeferson Manrique Anaya             |

**Curso:** Sistemas Operativos — UPC — Sección 11539
