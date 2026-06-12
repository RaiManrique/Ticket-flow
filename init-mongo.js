// =============================================================
//  TicketFlow — Capa de Datos (MongoDB orientado a documentos)
//  Plataforma de venta de boletos + red social de eventos (Perú)
// =============================================================

db = db.getSiblingDB('ticketflow_social');

// 0. LIMPIEZA DE ENTORNO (solo en primera inicialización del volumen)
db.usuarios.drop();
db.eventos.drop();
db.boletos.drop();
db.ventas.drop();
db.publicaciones.drop();
db.comentarios.drop();
db.follows.drop();

// =============================================================
// 1. COLECCIÓN: usuarios (perfiles y roles)
// =============================================================
db.createCollection("usuarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password_hash", "username", "fecha_registro"],
      properties: {
        _id: { bsonType: "objectId" },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        password_hash: { bsonType: "string" },
        username: { bsonType: "string", minLength: 3 },
        nombre_completo: { bsonType: "string" },
        foto_perfil_url: {
          bsonType: "string",
          description: "URL en object storage (ej. DigitalOcean Spaces)"
        },
        fecha_registro: { bsonType: "date" },
        rol: { enum: ["usuario", "organizador", "admin"] }
      }
    }
  },
  validationLevel: "strict"
});

db.usuarios.createIndex({ email: 1 }, { unique: true });
db.usuarios.createIndex({ username: 1 }, { unique: true });

// =============================================================
// 2. COLECCIÓN: eventos (catálogo y puntos de encuentro social)
// =============================================================
db.createCollection("eventos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["creador_id", "titulo", "fecha_evento", "ubicacion", "categoria"],
      properties: {
        _id: { bsonType: "objectId" },
        creador_id: { bsonType: "objectId", description: "Referencia a usuarios._id" },
        titulo: { bsonType: "string", minLength: 5, maxLength: 100 },
        descripcion: { bsonType: "string", maxLength: 2000 },
        categoria: {
          bsonType: "string",
          description: "Ej: concierto, teatro, festival, deporte"
        },
        ciudad: { bsonType: "string" },
        fecha_evento: { bsonType: "date" },
        flyer_url: { bsonType: "string" },
        ubicacion: {
          bsonType: "object",
          required: ["type", "coordinates"],
          properties: {
            type: { enum: ["Point"] },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: { bsonType: "double" }
            }
          }
        },
        asistentes: {
          bsonType: "array",
          description: "Usuarios que marcaron 'Asistiré'",
          items: { bsonType: "objectId" }
        },
        estado: { enum: ["borrador", "publicado", "agotado", "cancelado"] }
      }
    }
  },
  validationLevel: "strict"
});

db.eventos.createIndex({ ubicacion: "2dsphere" });
db.eventos.createIndex({ fecha_evento: 1 });
db.eventos.createIndex({ categoria: 1, ciudad: 1 });

// =============================================================
// 3. COLECCIÓN: boletos (inventario de asientos/entradas)
// =============================================================
db.createCollection("boletos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["evento_id", "zona", "precio", "estado"],
      properties: {
        _id: { bsonType: "objectId" },
        evento_id: { bsonType: "objectId", description: "Referencia a eventos._id" },
        zona: { bsonType: "string", description: "Ej: VIP, General, Platea" },
        fila: { bsonType: "string" },
        asiento: { bsonType: "string" },
        codigo_entrada: { bsonType: "string" },
        precio: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
        estado: {
          enum: ["disponible", "reservado", "vendido", "bloqueado"],
          description: "reservado aplica durante el cart timeout (15 min)"
        },
        reservado_por: { bsonType: "objectId" },
        reservado_hasta: { bsonType: "date" },
        vendido_a: { bsonType: "objectId" },
        fecha_venta: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict"
});

db.boletos.createIndex({ evento_id: 1, zona: 1, estado: 1 });
db.boletos.createIndex(
  { evento_id: 1, fila: 1, asiento: 1 },
  { unique: true, partialFilterExpression: { fila: { $exists: true }, asiento: { $exists: true } } }
);
db.boletos.createIndex({ codigo_entrada: 1 }, { unique: true, sparse: true });
db.boletos.createIndex({ estado: 1, reservado_hasta: 1 });

// =============================================================
// 4. COLECCIÓN: ventas (registro transaccional de compras)
// =============================================================
db.createCollection("ventas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "evento_id", "boletos_ids", "monto_total", "estado", "fecha_venta"],
      properties: {
        _id: { bsonType: "objectId" },
        usuario_id: { bsonType: "objectId" },
        evento_id: { bsonType: "objectId" },
        boletos_ids: {
          bsonType: "array",
          minItems: 1,
          items: { bsonType: "objectId" }
        },
        monto_total: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
        metodo_pago: { enum: ["tarjeta", "yape", "plin", "transferencia"] },
        estado: { enum: ["pendiente", "confirmada", "reembolsada", "fallida"] },
        referencia_pago: { bsonType: "string" },
        fecha_venta: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict"
});

db.ventas.createIndex({ usuario_id: 1, fecha_venta: -1 });
db.ventas.createIndex({ evento_id: 1, fecha_venta: -1 });
db.ventas.createIndex({ estado: 1 });

// =============================================================
// 5. COLECCIÓN: publicaciones (feed de la comunidad)
// =============================================================
db.createCollection("publicaciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "fecha_publicacion"],
      properties: {
        _id: { bsonType: "objectId" },
        usuario_id: { bsonType: "objectId" },
        evento_id: { bsonType: "objectId" },
        texto: { bsonType: "string", maxLength: 1000 },
        media_urls: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        fecha_publicacion: { bsonType: "date" },
        usuarios_likes: {
          bsonType: "array",
          items: { bsonType: "objectId" }
        }
      }
    }
  },
  validationLevel: "strict"
});

db.publicaciones.createIndex({ fecha_publicacion: -1, evento_id: 1 });

// =============================================================
// 6. COLECCIÓN: comentarios
// =============================================================
db.createCollection("comentarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["publicacion_id", "usuario_id", "texto", "fecha_comentario"],
      properties: {
        _id: { bsonType: "objectId" },
        publicacion_id: { bsonType: "objectId" },
        usuario_id: { bsonType: "objectId" },
        texto: { bsonType: "string", maxLength: 500 },
        fecha_comentario: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict"
});

db.comentarios.createIndex({ publicacion_id: 1, fecha_comentario: 1 });

// =============================================================
// 7. COLECCIÓN: follows (grafo de seguidores)
// =============================================================
db.createCollection("follows", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["follower_id", "following_id", "fecha_follow"],
      properties: {
        _id: { bsonType: "objectId" },
        follower_id: { bsonType: "objectId" },
        following_id: { bsonType: "objectId" },
        fecha_follow: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict"
});

db.follows.createIndex({ follower_id: 1, following_id: 1 }, { unique: true });
db.follows.createIndex({ following_id: 1 });

// =============================================================
// 8. DATOS DE EJEMPLO (evidencias y pruebas locales)
// =============================================================

var ahora = new Date();
var hace30dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
var hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
var en15min = new Date(ahora.getTime() + 15 * 60 * 1000);

var usuarioAdminId = ObjectId("64f0a0010000000000000001");
var usuarioOrg1Id = ObjectId("64f0a0010000000000000002");
var usuarioOrg2Id = ObjectId("64f0a0010000000000000003");
var usuario1Id = ObjectId("64f0a0010000000000000004");
var usuario2Id = ObjectId("64f0a0010000000000000005");
var usuario3Id = ObjectId("64f0a0010000000000000006");
var usuario4Id = ObjectId("64f0a0010000000000000007");

var eventoConciertoId = ObjectId("64f0b0010000000000000001");
var eventoFestivalId = ObjectId("64f0b0010000000000000002");
var eventoTeatroId = ObjectId("64f0b0010000000000000003");
var eventoCuscoId = ObjectId("64f0b0010000000000000004");

db.usuarios.insertMany([
  {
    _id: usuarioAdminId,
    email: "admin@ticketflow.pe",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "admin_ticketflow",
    nombre_completo: "Administrador TicketFlow",
    foto_perfil_url: "/img/perfiles/admin.jpg",
    fecha_registro: hace30dias,
    rol: "admin"
  },
  {
    _id: usuarioOrg1Id,
    email: "victor.arapa@upc.edu.pe",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "victor_arapa",
    nombre_completo: "Victor Piero Arapa Titi",
    foto_perfil_url: "/img/perfiles/victor.jpg",
    fecha_registro: hace30dias,
    rol: "organizador"
  },
  {
    _id: usuarioOrg2Id,
    email: "cesar.quispe@upc.edu.pe",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "cesar_quispe",
    nombre_completo: "Cesar Augusto Quispe Llacsahuanga",
    foto_perfil_url: "/img/perfiles/cesar.jpg",
    fecha_registro: hace30dias,
    rol: "organizador"
  },
  {
    _id: usuario1Id,
    email: "rai.manrique@upc.edu.pe",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "rai_manrique",
    nombre_completo: "Rai Jeferson Manrique Anaya",
    foto_perfil_url: "/img/perfiles/rai.jpg",
    fecha_registro: hace7dias,
    rol: "usuario"
  },
  {
    _id: usuario2Id,
    email: "maria.lopez@gmail.com",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "maria_eventos",
    nombre_completo: "Maria Lopez Fernandez",
    foto_perfil_url: "/img/perfiles/maria.jpg",
    fecha_registro: hace7dias,
    rol: "usuario"
  },
  {
    _id: usuario3Id,
    email: "carlos.ramirez@gmail.com",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "carlos_ramirez",
    nombre_completo: "Carlos Ramirez Vega",
    foto_perfil_url: "/img/perfiles/carlos.jpg",
    fecha_registro: hace7dias,
    rol: "usuario"
  },
  {
    _id: usuario4Id,
    email: "ana.torres@gmail.com",
    password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion",
    username: "ana_torres",
    nombre_completo: "Ana Torres Mendoza",
    foto_perfil_url: "/img/perfiles/ana.jpg",
    fecha_registro: hace7dias,
    rol: "usuario"
  }
]);

db.eventos.insertMany([
  {
    _id: eventoConciertoId,
    creador_id: usuarioOrg1Id,
    titulo: "Megaconcierto BTS en Lima 2026",
    descripcion: "Tres fechas en el Estadio Nacional. Venta oficial sin reventa. Comunidad TicketFlow para coordinar transporte y encuentros.",
    categoria: "concierto",
    ciudad: "Lima",
    fecha_evento: ISODate("2026-08-15T20:00:00Z"),
    flyer_url: "/img/eventos/concierto.jpg",
    ubicacion: { type: "Point", coordinates: [-77.0353, -12.0919] },
    asistentes: [usuario1Id, usuario2Id, usuario3Id],
    estado: "publicado"
  },
  {
    _id: eventoFestivalId,
    creador_id: usuarioOrg2Id,
    titulo: "Festival Selva Sonora 2026",
    descripcion: "Festival de musica peruana e internacional en el Jockey Club. Food trucks, zona VIP y foro de fans en TicketFlow.",
    categoria: "festival",
    ciudad: "Lima",
    fecha_evento: ISODate("2026-09-20T18:00:00Z"),
    flyer_url: "/img/eventos/festival.jpg",
    ubicacion: { type: "Point", coordinates: [-77.0253, -12.1247] },
    asistentes: [usuario2Id, usuario4Id],
    estado: "publicado"
  },
  {
    _id: eventoTeatroId,
    creador_id: usuarioOrg1Id,
    titulo: "Hamlet - Teatro Municipal de Lima",
    descripcion: "Obra clasica con elenco nacional. Funcion especial con charla post-show para la comunidad TicketFlow.",
    categoria: "teatro",
    ciudad: "Lima",
    fecha_evento: ISODate("2026-07-10T19:30:00Z"),
    flyer_url: "/img/eventos/teatro.jpg",
    ubicacion: { type: "Point", coordinates: [-77.0300, -12.0464] },
    asistentes: [usuario1Id],
    estado: "publicado"
  },
  {
    _id: eventoCuscoId,
    creador_id: usuarioOrg2Id,
    titulo: "Vibra Fest Cusco 2026",
    descripcion: "Festival electronico en la ciudad imperial. Edicion agotada.",
    categoria: "festival",
    ciudad: "Cusco",
    fecha_evento: ISODate("2026-06-15T16:00:00Z"),
    flyer_url: "/img/eventos/festival-cusco.jpg",
    ubicacion: { type: "Point", coordinates: [-71.9675, -13.5319] },
    asistentes: [usuario1Id, usuario2Id, usuario3Id, usuario4Id],
    estado: "publicado"
  }
]);

var boletoVipVendidoId = ObjectId("64f0c0010000000000000001");
var boletoGeneralVendidoId = ObjectId("64f0c0010000000000000002");
var boletoGeneralReservadoId = ObjectId("64f0c0010000000000000003");
var boletoFestivalVendidoId = ObjectId("64f0c0010000000000000004");
var boletoTeatroDisponible1Id = ObjectId("64f0c0010000000000000005");
var boletoTeatroDisponible2Id = ObjectId("64f0c0010000000000000006");

var boletosSeed = [
  { _id: boletoVipVendidoId, evento_id: eventoConciertoId, zona: "PLATINUM CENTRAL", fila: "PC-A", asiento: "12", codigo_entrada: "TF-BTS-PC-A12", precio: 599.0, estado: "vendido", vendido_a: usuario1Id, fecha_venta: hace7dias },
  { _id: boletoGeneralVendidoId, evento_id: eventoConciertoId, zona: "VIP", fila: "VIP-G", asiento: "8", codigo_entrada: "TF-BTS-VIP-G08", precio: 399.0, estado: "vendido", vendido_a: usuario2Id, fecha_venta: hace7dias },
  { _id: boletoGeneralReservadoId, evento_id: eventoConciertoId, zona: "VIP", fila: "VIP-H", asiento: "10", precio: 399.0, estado: "reservado", reservado_por: usuario3Id, reservado_hasta: en15min },
  { _id: boletoFestivalVendidoId, evento_id: eventoFestivalId, zona: "Platea", fila: "PLT-B", asiento: "8", codigo_entrada: "TF-SELVA-PLT-B08", precio: 180.0, estado: "vendido", vendido_a: usuario4Id, fecha_venta: hace7dias }
];

var skipSeat = { "PC-A|12": 1, "VIP-G|8": 1, "VIP-H|10": 1, "PLT-B|8": 1 };

function addSectorSeats(zona, prefix, rows, seatsPerRow, precio, mode) {
  rows.forEach(function (row, ri) {
    for (var s = 1; s <= seatsPerRow; s++) {
      var fila = prefix + "-" + row;
      if (skipSeat[fila + "|" + s]) continue;
      var estado = "disponible";
      if (mode === "soldout") estado = "vendido";
      else if (mode === "light") {
        if ((ri * seatsPerRow + s) % 19 === 0) estado = "vendido";
        if (ri === 0 && s === 3) estado = "reservado";
      } else if (mode === "half") {
        if (s % 2 === 0) estado = "vendido";
      }
      var doc = { evento_id: eventoConciertoId, zona: zona, fila: fila, asiento: String(s), precio: precio, estado: estado };
      if (estado === "reservado") doc.reservado_hasta = en15min;
      boletosSeed.push(doc);
    }
  });
}

var rows12 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
var rows16 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
var rows10 = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
var rows8 = ["A", "B", "C", "D", "E", "F", "G", "H"];

addSectorSeats("PLATINUM CENTRAL", "PC", rows12, 26, 599.0, "light");
addSectorSeats("PLATINUM LATERAL", "PL", rows10, 24, 479.0, "light");
addSectorSeats("VIP", "VIP", rows16, 30, 399.0, "light");
addSectorSeats("PREFERENCIAL", "PR", rows8, 20, 299.0, "half");
addSectorSeats("OCCIDENTE 1", "OC1", rows10, 22, 249.0, "light");
addSectorSeats("OCCIDENTE 2", "OC2", rows8, 20, 219.0, "light");
addSectorSeats("ORIENTE 1", "OR1", rows10, 22, 249.0, "light");
addSectorSeats("ORIENTE 2", "OR2", rows8, 20, 219.0, "light");
addSectorSeats("NORTE", "NO", rows10, 24, 189.0, "half");

["A", "B", "C"].forEach(function (fila) {
  for (var s = 1; s <= 10; s++) {
    var f = "PLT-" + fila;
    if (skipSeat[f + "|" + s]) continue;
    boletosSeed.push({
      evento_id: eventoFestivalId, zona: "Platea", fila: f, asiento: String(s), precio: 180.0,
      estado: (fila === "A" && s <= 4) ? "vendido" : "disponible"
    });
  }
});
for (var ga = 0; ga < 6; ga++) {
  boletosSeed.push({ evento_id: eventoFestivalId, zona: "General", precio: 120.0, estado: ga < 2 ? "vendido" : "disponible" });
}
["A", "B", "C"].forEach(function (fila) {
  for (var s = 1; s <= 8; s++) {
    boletosSeed.push({
      evento_id: eventoTeatroId, zona: "Platea", fila: "TE-" + fila, asiento: String(s), precio: 120.0,
      estado: (fila === "A" && s <= 2) ? "vendido" : "disponible"
    });
  }
});
boletosSeed.push(
  { _id: boletoTeatroDisponible1Id, evento_id: eventoTeatroId, zona: "Balcón", fila: "BA-C", asiento: "3", precio: 95.0, estado: "disponible" },
  { _id: boletoTeatroDisponible2Id, evento_id: eventoTeatroId, zona: "Balcón", fila: "BA-C", asiento: "4", precio: 95.0, estado: "disponible" },
  { evento_id: eventoCuscoId, zona: "General", precio: 150.0, estado: "vendido", vendido_a: usuario1Id, fecha_venta: hace7dias },
  { evento_id: eventoCuscoId, zona: "VIP", precio: 280.0, estado: "vendido", vendido_a: usuario2Id, fecha_venta: hace7dias }
);

db.boletos.insertMany(boletosSeed);

var venta1Id = ObjectId("64f0d0010000000000000001");
var venta2Id = ObjectId("64f0d0010000000000000002");
var venta3Id = ObjectId("64f0d0010000000000000003");

db.ventas.insertMany([
  {
    _id: venta1Id,
    usuario_id: usuario1Id,
    evento_id: eventoConciertoId,
    boletos_ids: [boletoVipVendidoId],
    monto_total: 599.0,
    metodo_pago: "tarjeta",
    estado: "confirmada",
    referencia_pago: "PAY-BTS-2026-0001",
    fecha_venta: hace7dias
  },
  {
    _id: venta2Id,
    usuario_id: usuario2Id,
    evento_id: eventoConciertoId,
    boletos_ids: [boletoGeneralVendidoId],
    monto_total: 399.0,
    metodo_pago: "yape",
    estado: "confirmada",
    referencia_pago: "PAY-BTS-2026-0002",
    fecha_venta: hace7dias
  },
  {
    _id: venta3Id,
    usuario_id: usuario4Id,
    evento_id: eventoFestivalId,
    boletos_ids: [boletoFestivalVendidoId],
    monto_total: 180.0,
    metodo_pago: "plin",
    estado: "confirmada",
    referencia_pago: "PAY-SELVA-2026-0001",
    fecha_venta: hace7dias
  }
]);

var publicacion1Id = ObjectId("64f0e0010000000000000001");
var publicacion2Id = ObjectId("64f0e0010000000000000002");
var publicacion3Id = ObjectId("64f0e0010000000000000003");

db.publicaciones.insertMany([
  {
    _id: publicacion1Id,
    usuario_id: usuario1Id,
    evento_id: eventoConciertoId,
    texto: "Ya tengo mi entrada VIP para BTS! Alguien del grupo UPC va en la misma fila?",
    media_urls: ["/img/posts/entrada.jpg"],
    fecha_publicacion: hace7dias,
    usuarios_likes: [usuario2Id, usuario3Id, usuario4Id]
  },
  {
    _id: publicacion2Id,
    usuario_id: usuario2Id,
    evento_id: eventoFestivalId,
    texto: "Selva Sonora va a estar increible. Busco grupo para ir juntos desde San Miguel.",
    media_urls: ["/img/posts/festival-grupo.jpg"],
    fecha_publicacion: hace7dias,
    usuarios_likes: [usuario1Id]
  },
  {
    _id: publicacion3Id,
    usuario_id: usuarioOrg1Id,
    texto: "Recordatorio: la preventa del megaconcierto cierra en 48 horas. Eviten reventa informal, compren solo por TicketFlow.",
    fecha_publicacion: ahora,
    usuarios_likes: [usuario1Id, usuario2Id]
  },
  {
    _id: ObjectId("64f0e0010000000000000004"),
    usuario_id: usuario3Id,
    evento_id: eventoConciertoId,
    texto: "Carlos subio una foto en el ensayo del megaconcierto. El estadio se ve enorme!",
    media_urls: ["/img/posts/estadio.jpg"],
    fecha_publicacion: hace7dias,
    usuarios_likes: [usuario1Id, usuario2Id, usuario4Id]
  },
  {
    _id: ObjectId("64f0e0010000000000000005"),
    usuario_id: usuario4Id,
    evento_id: eventoFestivalId,
    texto: "Quien va a Selva Sonora en Lima? Armemos el grupo!",
    fecha_publicacion: ahora,
    usuarios_likes: [usuario2Id, usuario3Id]
  }
]);

db.comentarios.insertMany([
  {
    publicacion_id: publicacion1Id,
    usuario_id: usuario2Id,
    texto: "Yo tambien voy! Nos vemos en la puerta principal 2 horas antes.",
    fecha_comentario: hace7dias
  },
  {
    publicacion_id: publicacion1Id,
    usuario_id: usuario3Id,
    texto: "Todavia estoy en fila virtual, ojala me alcance un General.",
    fecha_comentario: hace7dias
  },
  {
    publicacion_id: publicacion2Id,
    usuario_id: usuario4Id,
    texto: "Yo salgo de Magdalena, podemos coordinar un meetup en el feed del evento.",
    fecha_comentario: hace7dias
  }
]);

db.follows.insertMany([
  { follower_id: usuario1Id, following_id: usuarioOrg1Id, fecha_follow: hace30dias },
  { follower_id: usuario2Id, following_id: usuarioOrg1Id, fecha_follow: hace30dias },
  { follower_id: usuario1Id, following_id: usuario2Id, fecha_follow: hace7dias },
  { follower_id: usuario3Id, following_id: usuario1Id, fecha_follow: hace7dias },
  { follower_id: usuario4Id, following_id: usuarioOrg2Id, fecha_follow: hace7dias }
]);

print("Base de datos TicketFlow (ticketflow_social) inicializada correctamente.");
print("Datos de ejemplo cargados:");
print("  - usuarios: " + db.usuarios.countDocuments());
print("  - eventos: " + db.eventos.countDocuments());
print("  - boletos: " + db.boletos.countDocuments());
print("  - ventas: " + db.ventas.countDocuments());
print("  - publicaciones: " + db.publicaciones.countDocuments());
print("  - comentarios: " + db.comentarios.countDocuments());
print("  - follows: " + db.follows.countDocuments());
