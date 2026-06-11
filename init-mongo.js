// =============================================================

//  TicketFlow Social — Script Arquitectura Empresarial v2

//  Incluye Eventos, Red Social y Redirección a Object Storage

// =============================================================



db = db.getSiblingDB('ticketflow_social');



// 0. LIMPIEZA DE ENTORNO OPERATIVO

db.usuarios.drop();

db.eventos.drop();

db.publicaciones.drop();

db.comentarios.drop();

db.follows.drop();



// =============================================================

// 1. COLECCIÓN: usuarios

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

          description: "Ej: https://ticketflow.sfo3.digitaloceanspaces.com/perfiles/user123.webp" 

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

// 2. COLECCIÓN: eventos (Puntos de Encuentro Social)

// =============================================================

db.createCollection("eventos", {

  validator: {

    $jsonSchema: {

      bsonType: "object",

      required: ["creador_id", "titulo", "fecha_evento", "ubicacion"],

      properties: {

        _id: { bsonType: "objectId" },

        creador_id: { bsonType: "objectId", description: "Referencia a usuarios._id" },

        titulo: { bsonType: "string", minLength: 5, maxLength: 100 },

        descripcion: { bsonType: "string", maxLength: 2000 },

        fecha_evento: { bsonType: "date" },

        flyer_url: { 

          bsonType: "string", 

          description: "URL del banner guardado en DigitalOcean Spaces" 

        },

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

          description: "Usuarios que han marcado 'Asistiré'",

          items: { bsonType: "objectId" }

        }

      }

    }

  },

  validationLevel: "strict"

});



// Índice geoespacial para buscar eventos cercanos en el mapa

db.eventos.createIndex({ ubicacion: "2dsphere" });

db.eventos.createIndex({ fecha_evento: 1 });





// =============================================================

// 3. COLECCIÓN: publicaciones (El Feed)

// =============================================================

db.createCollection("publicaciones", {

  validator: {

    $jsonSchema: {

      bsonType: "object",

      required: ["usuario_id", "fecha_publicacion"],

      properties: {

        _id: { bsonType: "objectId" },

        usuario_id: { bsonType: "objectId" },

        evento_id: { bsonType: "objectId", description: "Opcional: Si la foto/texto es sobre un evento específico" },

        texto: { bsonType: "string", maxLength: 1000 },

        media_urls: {

          bsonType: "array",

          description: "Arreglo de URLs apuntando a DigitalOcean Spaces (Videos/Fotos)",

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

// 4. COLECCIÓN: comentarios

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

// 5. COLECCIÓN: follows (Grafo de Seguidores)

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



// Evita que un usuario siga a la misma persona dos veces

db.follows.createIndex({ follower_id: 1, following_id: 1 }, { unique: true });

db.follows.createIndex({ following_id: 1 });



print("✅ Base de datos TicketFlow Social inicializada correctamente.");

