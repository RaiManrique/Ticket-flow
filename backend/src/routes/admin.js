const express = require("express");
const { requireAuth, requireStaff, requireAdmin } = require("../middleware/auth");
const { Usuario, Evento, Publicacion } = require("../models");
const { requireObjectId } = require("../utils/validate");
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
    const eventIds = await eventIdsForStaff(req.user);
    const eventoScope = eventCreatorFilter(req.user);

    const [usuarios, eventosCount, publicacionesCount, proximosEventos, todosEventos] = await Promise.all([
      adminView ? Usuario.countDocuments() : Promise.resolve(0),
      Evento.countDocuments(eventoScope),
      eventIds && !eventIds.length
        ? Promise.resolve(0)
        : Publicacion.countDocuments(
            eventIds ? { evento_id: { $in: eventIds } } : {}
          ),
      Evento.find(eventoScope)
        .sort({ fecha_evento: 1 })
        .limit(4)
        .select("titulo ciudad fecha_evento estado categoria")
        .lean(),
      Evento.find(eventoScope).select("asistentes").lean(),
    ]);

    let asistentesCount = 0;
    if (todosEventos) {
      todosEventos.forEach((ev) => {
        if (ev.asistentes) {
          asistentesCount += ev.asistentes.length;
        }
      });
    }

    res.json({
      scope: adminView ? "admin" : "organizador",
      resumen: {
        usuarios: adminView ? usuarios : null,
        eventos: eventosCount,
        publicaciones: publicacionesCount,
        asistentes: asistentesCount,
      },
      proximos_eventos: proximosEventos,
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
    
    // Add total_asistentes count
    const enriched = eventos.map(e => ({
      ...e,
      total_asistentes: e.asistentes ? e.asistentes.length : 0
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/eventos/:id/detalle", async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await findStaffEvento(req, req.params.id);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    const asistenteIds = evento.asistentes || [];
    const asistentes = asistenteIds.length
      ? await Usuario.find({ _id: { $in: asistenteIds } }).select("username nombre_completo email foto_perfil_url").lean()
      : [];

    res.json({
      evento,
      asistentes,
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
