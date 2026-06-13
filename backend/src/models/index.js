const mongoose = require("mongoose");

const usuarioSchema = new mongoose.Schema(
  {
    email: String,
    password_hash: String,
    username: String,
    nombre_completo: String,
    foto_perfil_url: String,
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

const boletoSchema = new mongoose.Schema(
  {
    evento_id: mongoose.Schema.Types.ObjectId,
    zona: String,
    fila: String,
    asiento: String,
    codigo_entrada: String,
    precio: Number,
    estado: String,
    reservado_por: mongoose.Schema.Types.ObjectId,
    reservado_hasta: Date,
    vendido_a: mongoose.Schema.Types.ObjectId,
    fecha_venta: Date,
  },
  { collection: "boletos" }
);

const ventaSchema = new mongoose.Schema(
  {
    usuario_id: mongoose.Schema.Types.ObjectId,
    evento_id: mongoose.Schema.Types.ObjectId,
    boletos_ids: [mongoose.Schema.Types.ObjectId],
    monto_total: Number,
    metodo_pago: String,
    estado: String,
    referencia_pago: String,
    fecha_venta: Date,
  },
  { collection: "ventas" }
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
    fecha_comentario: Date,
  },
  { collection: "comentarios" }
);

module.exports = {
  Usuario: mongoose.model("Usuario", usuarioSchema),
  Evento: mongoose.model("Evento", eventoSchema),
  Boleto: mongoose.model("Boleto", boletoSchema),
  Venta: mongoose.model("Venta", ventaSchema),
  Publicacion: mongoose.model("Publicacion", publicacionSchema),
  Comentario: mongoose.model("Comentario", comentarioSchema),
};
