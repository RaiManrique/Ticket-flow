// Carga o recarga datos de ejemplo sin recrear esquemas
db = db.getSiblingDB('ticketflow_social');

db.usuarios.deleteMany({});
db.eventos.deleteMany({});
db.boletos.deleteMany({});
db.ventas.deleteMany({});
db.publicaciones.deleteMany({});
db.comentarios.deleteMany({});
db.follows.deleteMany({});

// Ajusta validadores en bases ya creadas (precio/monto aceptan enteros y decimales)
db.runCommand({
  collMod: "boletos",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["evento_id", "zona", "precio", "estado"],
      properties: {
        _id: { bsonType: "objectId" },
        evento_id: { bsonType: "objectId" },
        zona: { bsonType: "string" },
        fila: { bsonType: "string" },
        asiento: { bsonType: "string" },
        codigo_entrada: { bsonType: "string" },
        precio: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
        estado: { enum: ["disponible", "reservado", "vendido", "bloqueado"] },
        reservado_por: { bsonType: "objectId" },
        reservado_hasta: { bsonType: "date" },
        vendido_a: { bsonType: "objectId" },
        fecha_venta: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict"
});

db.runCommand({
  collMod: "ventas",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "evento_id", "boletos_ids", "monto_total", "estado", "fecha_venta"],
      properties: {
        _id: { bsonType: "objectId" },
        usuario_id: { bsonType: "objectId" },
        evento_id: { bsonType: "objectId" },
        boletos_ids: { bsonType: "array", minItems: 1, items: { bsonType: "objectId" } },
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
  { _id: usuarioAdminId, email: "admin@ticketflow.pe", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "admin_ticketflow", nombre_completo: "Administrador TicketFlow", foto_perfil_url: "/img/perfiles/admin.jpg", fecha_registro: hace30dias, rol: "admin" },
  { _id: usuarioOrg1Id, email: "victor.arapa@upc.edu.pe", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "victor_arapa", nombre_completo: "Victor Piero Arapa Titi", foto_perfil_url: "/img/perfiles/victor.jpg", fecha_registro: hace30dias, rol: "organizador" },
  { _id: usuarioOrg2Id, email: "cesar.quispe@upc.edu.pe", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "cesar_quispe", nombre_completo: "Cesar Augusto Quispe Llacsahuanga", foto_perfil_url: "/img/perfiles/cesar.jpg", fecha_registro: hace30dias, rol: "organizador" },
  { _id: usuario1Id, email: "rai.manrique@upc.edu.pe", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "rai_manrique", nombre_completo: "Rai Jeferson Manrique Anaya", foto_perfil_url: "/img/perfiles/rai.jpg", fecha_registro: hace7dias, rol: "usuario" },
  { _id: usuario2Id, email: "maria.lopez@gmail.com", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "maria_eventos", nombre_completo: "Maria Lopez Fernandez", foto_perfil_url: "/img/perfiles/maria.jpg", fecha_registro: hace7dias, rol: "usuario" },
  { _id: usuario3Id, email: "carlos.ramirez@gmail.com", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "carlos_ramirez", nombre_completo: "Carlos Ramirez Vega", foto_perfil_url: "/img/perfiles/carlos.jpg", fecha_registro: hace7dias, rol: "usuario" },
  { _id: usuario4Id, email: "ana.torres@gmail.com", password_hash: "$2b$10$EjemploHashSoloDemoNoUsarEnProduccion", username: "ana_torres", nombre_completo: "Ana Torres Mendoza", foto_perfil_url: "/img/perfiles/ana.jpg", fecha_registro: hace7dias, rol: "usuario" }
]);

db.eventos.insertMany([
  { _id: eventoConciertoId, creador_id: usuarioOrg1Id, titulo: "Megaconcierto BTS en Lima 2026", descripcion: "Tres fechas en el Estadio Nacional. Venta oficial sin reventa.", categoria: "concierto", ciudad: "Lima", fecha_evento: ISODate("2026-08-15T20:00:00Z"), flyer_url: "/img/eventos/concierto.jpg", ubicacion: { type: "Point", coordinates: [-77.0353, -12.0919] }, asistentes: [usuario1Id, usuario2Id, usuario3Id], estado: "publicado" },
  { _id: eventoFestivalId, creador_id: usuarioOrg2Id, titulo: "Festival Selva Sonora 2026", descripcion: "Festival de musica peruana e internacional en el Jockey Club.", categoria: "festival", ciudad: "Lima", fecha_evento: ISODate("2026-09-20T18:00:00Z"), flyer_url: "/img/eventos/festival.jpg", ubicacion: { type: "Point", coordinates: [-77.0253, -12.1247] }, asistentes: [usuario2Id, usuario4Id], estado: "publicado" },
  { _id: eventoTeatroId, creador_id: usuarioOrg1Id, titulo: "Hamlet - Teatro Municipal de Lima", descripcion: "Obra clasica con elenco nacional.", categoria: "teatro", ciudad: "Lima", fecha_evento: ISODate("2026-07-10T19:30:00Z"), flyer_url: "/img/eventos/teatro.jpg", ubicacion: { type: "Point", coordinates: [-77.0300, -12.0464] }, asistentes: [usuario1Id], estado: "publicado" },
  { _id: eventoCuscoId, creador_id: usuarioOrg2Id, titulo: "Vibra Fest Cusco 2026", descripcion: "Festival electronico en la ciudad imperial. Edicion agotada.", categoria: "festival", ciudad: "Cusco", fecha_evento: ISODate("2026-06-15T16:00:00Z"), flyer_url: "/img/eventos/festival-cusco.jpg", ubicacion: { type: "Point", coordinates: [-71.9675, -13.5319] }, asistentes: [usuario1Id, usuario2Id, usuario3Id, usuario4Id], estado: "publicado" }
]);

var boletoVipVendidoId = ObjectId("64f0c0010000000000000001");
var boletoGeneralVendidoId = ObjectId("64f0c0010000000000000002");
var boletoGeneralReservadoId = ObjectId("64f0c0010000000000000003");
var boletoFestivalVendidoId = ObjectId("64f0c0010000000000000004");

db.boletos.insertMany([
  { _id: boletoVipVendidoId, evento_id: eventoConciertoId, zona: "VIP", fila: "A", asiento: "12", codigo_entrada: "TF-BTS-VIP-A12", precio: 850.0, estado: "vendido", vendido_a: usuario1Id, fecha_venta: hace7dias },
  { _id: boletoGeneralVendidoId, evento_id: eventoConciertoId, zona: "General", fila: "G", asiento: "45", codigo_entrada: "TF-BTS-GEN-G45", precio: 320.0, estado: "vendido", vendido_a: usuario2Id, fecha_venta: hace7dias },
  { _id: boletoGeneralReservadoId, evento_id: eventoConciertoId, zona: "General", fila: "H", asiento: "10", precio: 320.0, estado: "reservado", reservado_por: usuario3Id, reservado_hasta: en15min },
  { _id: boletoFestivalVendidoId, evento_id: eventoFestivalId, zona: "Platea", fila: "B", asiento: "8", codigo_entrada: "TF-SELVA-PLT-B08", precio: 180.0, estado: "vendido", vendido_a: usuario4Id, fecha_venta: hace7dias },
  { evento_id: eventoTeatroId, zona: "Balcón", fila: "C", asiento: "3", precio: 95.0, estado: "disponible" },
  { evento_id: eventoTeatroId, zona: "Balcón", fila: "C", asiento: "4", precio: 95.0, estado: "disponible" },
  { evento_id: eventoConciertoId, zona: "General", fila: "J", asiento: "22", precio: 320.0, estado: "disponible" },
  { evento_id: eventoFestivalId, zona: "General", precio: 120.0, estado: "disponible" },
  { evento_id: eventoCuscoId, zona: "General", precio: 150.0, estado: "vendido", vendido_a: usuario1Id, fecha_venta: hace7dias },
  { evento_id: eventoCuscoId, zona: "VIP", precio: 280.0, estado: "vendido", vendido_a: usuario2Id, fecha_venta: hace7dias }
]);

db.ventas.insertMany([
  { _id: ObjectId("64f0d0010000000000000001"), usuario_id: usuario1Id, evento_id: eventoConciertoId, boletos_ids: [boletoVipVendidoId], monto_total: 850.0, metodo_pago: "tarjeta", estado: "confirmada", referencia_pago: "PAY-BTS-2026-0001", fecha_venta: hace7dias },
  { _id: ObjectId("64f0d0010000000000000002"), usuario_id: usuario2Id, evento_id: eventoConciertoId, boletos_ids: [boletoGeneralVendidoId], monto_total: 320.0, metodo_pago: "yape", estado: "confirmada", referencia_pago: "PAY-BTS-2026-0002", fecha_venta: hace7dias },
  { _id: ObjectId("64f0d0010000000000000003"), usuario_id: usuario4Id, evento_id: eventoFestivalId, boletos_ids: [boletoFestivalVendidoId], monto_total: 180.0, metodo_pago: "plin", estado: "confirmada", referencia_pago: "PAY-SELVA-2026-0001", fecha_venta: hace7dias }
]);

var publicacion1Id = ObjectId("64f0e0010000000000000001");
var publicacion2Id = ObjectId("64f0e0010000000000000002");

db.publicaciones.insertMany([
  { _id: publicacion1Id, usuario_id: usuario1Id, evento_id: eventoConciertoId, texto: "Ya tengo mi entrada VIP para BTS! Alguien del grupo UPC va en la misma fila?", media_urls: ["/img/posts/entrada.jpg"], fecha_publicacion: hace7dias, usuarios_likes: [usuario2Id, usuario3Id, usuario4Id] },
  { _id: publicacion2Id, usuario_id: usuario2Id, evento_id: eventoFestivalId, texto: "Selva Sonora va a estar increible. Busco grupo para ir juntos desde San Miguel.", media_urls: ["/img/posts/festival-grupo.jpg"], fecha_publicacion: hace7dias, usuarios_likes: [usuario1Id] },
  { _id: ObjectId("64f0e0010000000000000003"), usuario_id: usuarioOrg1Id, texto: "Recordatorio: la preventa del megaconcierto cierra en 48 horas.", fecha_publicacion: ahora, usuarios_likes: [usuario1Id, usuario2Id] },
  { _id: ObjectId("64f0e0010000000000000004"), usuario_id: usuario3Id, evento_id: eventoConciertoId, texto: "Juan subio una foto en el ensayo del megaconcierto. El estadio se ve enorme!", media_urls: ["/img/posts/estadio.jpg"], fecha_publicacion: hace7dias, usuarios_likes: [usuario1Id, usuario2Id, usuario4Id] },
  { _id: ObjectId("64f0e0010000000000000005"), usuario_id: usuario4Id, evento_id: eventoFestivalId, texto: "Quien va a Selva Sonora en Lima? Armemos el grupo!", fecha_publicacion: ahora, usuarios_likes: [usuario2Id, usuario3Id] }
]);

db.comentarios.insertMany([
  { publicacion_id: publicacion1Id, usuario_id: usuario2Id, texto: "Yo tambien voy! Nos vemos en la puerta principal 2 horas antes.", fecha_comentario: hace7dias },
  { publicacion_id: publicacion1Id, usuario_id: usuario3Id, texto: "Todavia estoy en fila virtual, ojala me alcance un General.", fecha_comentario: hace7dias },
  { publicacion_id: publicacion2Id, usuario_id: usuario4Id, texto: "Yo salgo de Magdalena, podemos coordinar un meetup en el feed del evento.", fecha_comentario: hace7dias }
]);

db.follows.insertMany([
  { follower_id: usuario1Id, following_id: usuarioOrg1Id, fecha_follow: hace30dias },
  { follower_id: usuario2Id, following_id: usuarioOrg1Id, fecha_follow: hace30dias },
  { follower_id: usuario1Id, following_id: usuario2Id, fecha_follow: hace7dias },
  { follower_id: usuario3Id, following_id: usuario1Id, fecha_follow: hace7dias },
  { follower_id: usuario4Id, following_id: usuarioOrg2Id, fecha_follow: hace7dias }
]);

print("Datos de ejemplo cargados correctamente.");
print("  - usuarios: " + db.usuarios.countDocuments());
print("  - eventos: " + db.eventos.countDocuments());
print("  - boletos: " + db.boletos.countDocuments());
print("  - ventas: " + db.ventas.countDocuments());
print("  - publicaciones: " + db.publicaciones.countDocuments());
print("  - comentarios: " + db.comentarios.countDocuments());
print("  - follows: " + db.follows.countDocuments());
