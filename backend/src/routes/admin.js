const express = require("express");
const { requireAuth, requireStaff, requireAdmin } = require("../middleware/auth");
const { Usuario, Evento, Publicacion } = require("../models");
const { requireObjectId } = require("../utils/validate");
const { aggregateEventoResumenes } = require("../utils/event-stats");
const {
  userObjectId,
  isPlatformAdmin,
  eventCreatorFilter,
  eventIdsForStaff,
} = require("../utils/staff");

const router = express.Router();

router.use(requireAuth, requireStaff);

async function findStaffEvento(req, eventoId) {
  const filter = { _id: eventoId, ...eventCreatorFilter(req.user) };
  if (isPlatformAdmin(req.user)) {
    delete filter.creador_id;
  }
  return Evento.findOne(filter).lean();
}

router.get("/dashboard", async (req, res) => {
  try {
    const adminView = isPlatformAdmin(req.user);
    const eventoScope = eventCreatorFilter(req.user);
    const eventIds = await eventIdsForStaff(req.user);

    const [usuarios, eventos, publicaciones, proximosEventos, topEventosAgg] = await Promise.all([
      adminView ? Usuario.countDocuments() : Promise.resolve(0),
      Evento.countDocuments(eventoScope),
      eventIds && !eventIds.length
        ? Promise.resolve(0)
        : Publicacion.countDocuments(eventIds ? { evento_id: { $in: eventIds } } : {}),
      Evento.find(eventoScope)
        .sort({ fecha_evento: 1 })
        .limit(4)
        .select("titulo ciudad fecha_evento estado categoria")
        .lean(),
      Publicacion.aggregate([
        ...(eventIds ? [{ $match: { evento_id: { $in: eventIds } } }] : []),
        {
          $group: {
            _id: "$evento_id",
            publicaciones: { $sum: 1 },
            likes: { $sum: { $size: { $ifNull: ["$usuarios_likes", []] } } },
          },
        },
        { $sort: { publicaciones: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const topEventoIds = topEventosAgg.map((t) => t._id);
    const topEventosDocs = topEventoIds.length
      ? await Evento.find({ _id: { $in: topEventoIds } }).select("titulo ciudad").lean()
      : [];
    const topEventosMap = Object.fromEntries(topEventosDocs.map((e) => [String(e._id), e]));

    const publicacionesRecientes = await Publicacion.find(
      eventIds ? { evento_id: { $in: eventIds } } : {}
    )
      .sort({ fecha_publicacion: -1 })
      .limit(8)
      .lean();

    const usuarioIds = [...new Set(publicacionesRecientes.map((p) => String(p.usuario_id)))];
    const eventoIdsRecientes = [...new Set(publicacionesRecientes.map((p) => String(p.evento_id)))];
    const [usuariosMap, eventosMap] = await Promise.all([
      Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo").lean(),
      Evento.find({ _id: { $in: eventoIdsRecientes } }).select("titulo").lean(),
    ]);
    const uMap = Object.fromEntries(usuariosMap.map((u) => [String(u._id), u]));
    const eMap = Object.fromEntries(eventosMap.map((e) => [String(e._id), e]));

    res.json({
      scope: adminView ? "admin" : "organizador",
      resumen: {
        usuarios: adminView ? usuarios : null,
        eventos,
        publicaciones,
      },
      top_eventos: topEventosAgg.map((t) => ({
        evento_id: t._id,
        evento: topEventosMap[String(t._id)] || null,
        publicaciones: t.publicaciones,
        likes: t.likes,
      })),
      proximos_eventos: proximosEventos,
      publicaciones_recientes: publicacionesRecientes.map((p) => ({
        ...p,
        autor: uMap[String(p.usuario_id)] || null,
        evento: eMap[String(p.evento_id)] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/usuarios", requireAdmin, async (_req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select("-password_hash")
      .sort({ rol: 1, fecha_registro: -1 })
      .lean();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/eventos", async (req, res) => {
  try {
    const eventos = await Evento.find(eventCreatorFilter(req.user))
      .sort({ fecha_evento: 1 })
      .lean();
    const resumenes = await aggregateEventoResumenes(eventos.map((e) => e._id));
    res.json(
      eventos.map((e) => ({
        ...e,
        resumen: resumenes[String(e._id)] || null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/eventos/:id/detalle", async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await findStaffEvento(req, req.params.id);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    const eventoId = evento._id;
    const [resumenes, publicacionesRecientes] = await Promise.all([
      aggregateEventoResumenes([eventoId]),
      Publicacion.find({ evento_id: eventoId })
        .sort({ fecha_publicacion: -1 })
        .limit(8)
        .lean(),
    ]);

    const usuarioIds = [...new Set(publicacionesRecientes.map((p) => String(p.usuario_id)))];
    const usuarios = usuarioIds.length
      ? await Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo").lean()
      : [];
    const uMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));

    res.json({
      evento,
      resumen: resumenes[String(eventoId)] || null,
      publicaciones_recientes: publicacionesRecientes.map((p) => ({
        ...p,
        autor: uMap[String(p.usuario_id)] || null,
      })),
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post("/eventos", async (req, res) => {
  const { titulo, descripcion, categoria, ciudad, fecha_evento, flyer_url } = req.body;

  if (!titulo || !categoria || !ciudad || !fecha_evento) {
    return res.status(400).json({ error: "Titulo, categoria, ciudad y fecha son obligatorios" });
  }

  const tituloTxt = String(titulo).trim();
  if (tituloTxt.length < 5) {
    return res.status(400).json({ error: "El titulo debe tener al menos 5 caracteres" });
  }

  const fecha = new Date(fecha_evento);
  if (Number.isNaN(fecha.getTime())) {
    return res.status(400).json({ error: "Fecha de evento invalida" });
  }

  try {
    const evento = await Evento.create({
      creador_id: userObjectId(req.user),
      titulo: tituloTxt,
      descripcion: String(descripcion || "").trim(),
      categoria: String(categoria).trim(),
      ciudad: String(ciudad).trim(),
      fecha_evento: fecha,
      flyer_url: String(flyer_url || "/img/eventos/concierto.jpg").trim(),
      ubicacion: { type: "Point", coordinates: [-77.0353, -12.0919] },
      asistentes: [],
      estado: "publicado",
    });

    res.status(201).json({
      ...evento.toObject(),
      visible_publico: true,
      mensaje: "Evento publicado y visible para todos los usuarios de TicketFlow.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
