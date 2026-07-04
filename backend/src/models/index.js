const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema(
  {
    email: String,
    password_hash: String,
    username: String,
    nombre_completo: String,
    foto_perfil_url: String,
    foto_portada_url: String,
    fecha_registro: Date,
    rol: String,
  },
  { collection: "usuarios" }
);

const eventoSchema = new mongoose.Schema(
  {
    creador_id: mongoose.Schema.Types.ObjectId,
    titulo: String,
    descripcion: String,
    categoria: String,
    ciudad: String,
    fecha_evento: Date,
    flyer_url: String,
    ubicacion: mongoose.Schema.Types.Mixed,
    asistentes: [mongoose.Schema.Types.ObjectId],
    estado: String,
  },
  { collection: "eventos" }
);

const publicacionSchema = new mongoose.Schema(
  {
    usuario_id: mongoose.Schema.Types.ObjectId,
    evento_id: mongoose.Schema.Types.ObjectId,
    texto: String,
    media_urls: [String],
    fecha_publicacion: Date,
    usuarios_likes: [mongoose.Schema.Types.ObjectId],
  },
  { collection: "publicaciones" }
);

const comentarioSchema = new mongoose.Schema(
  {
    publicacion_id: mongoose.Schema.Types.ObjectId,
    usuario_id: mongoose.Schema.Types.ObjectId,
    texto: String,
    media_urls: [String],
    fecha_comentario: Date,
  },
  { collection: "comentarios" }
);

module.exports = {
  Usuario: mongoose.model("Usuario", usuarioSchema),
  Evento: mongoose.model("Evento", eventoSchema),
  Publicacion: mongoose.model("Publicacion", publicacionSchema),
  Comentario: mongoose.model("Comentario", comentarioSchema),
};
