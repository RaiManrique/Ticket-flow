const express = require("express");
const { Evento } = require("../models");
const { requireObjectId } = require("../utils/validate");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// READ ALL
router.get("/", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const eventos = await Evento.find({ estado: { $in: ["publicado", "agotado"] } })
      .sort({ fecha_evento: 1 })
      .lean();

    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ ONE
router.get("/:id", async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(evento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ DETALLE
router.get("/:id/detalle", async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    res.json(evento);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// CREATE
router.post("/", requireAuth, async (req, res) => {
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
      creador_id: req.user._id,
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

    res.status(201).json(evento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
router.put("/:id", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const { titulo, descripcion, categoria, ciudad, fecha_evento, flyer_url, estado } = req.body;
    
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    // Check if the user is the creator or has admin privileges
    if (evento.creador_id.toString() !== req.user._id.toString() && req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para modificar este evento" });
    }

    if (titulo) {
      const tituloTxt = String(titulo).trim();
      if (tituloTxt.length < 5) {
        return res.status(400).json({ error: "El titulo debe tener al menos 5 caracteres" });
      }
      evento.titulo = tituloTxt;
    }

    if (descripcion !== undefined) evento.descripcion = String(descripcion).trim();
    if (categoria) evento.categoria = String(categoria).trim();
    if (ciudad) evento.ciudad = String(ciudad).trim();
    
    if (fecha_evento) {
      const fecha = new Date(fecha_evento);
      if (Number.isNaN(fecha.getTime())) {
        return res.status(400).json({ error: "Fecha de evento invalida" });
      }
      evento.fecha_evento = fecha;
    }

    if (flyer_url) evento.flyer_url = String(flyer_url).trim();
    if (estado) evento.estado = String(estado).trim();

    await evento.save();
    res.json(evento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    // Check permissions
    if (evento.creador_id.toString() !== req.user._id.toString() && req.user.rol !== "admin") {
      return res.status(403).json({ error: "No tienes permiso para eliminar este evento" });
    }

    await Evento.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Evento eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TOGGLE ATTENDANCE
router.post("/:id/asistir", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const userId = req.user._id;
    const evento = await Evento.findById(req.params.id);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    evento.asistentes = evento.asistentes || [];
    const index = evento.asistentes.findIndex(id => id.toString() === userId.toString());
    let asistiendo = false;

    if (index === -1) {
      evento.asistentes.push(userId);
      asistiendo = true;
    } else {
      evento.asistentes.splice(index, 1);
      asistiendo = false;
    }

    await evento.save();
    res.json({ asistiendo, totalAsistentes: evento.asistentes.length, asistentes: evento.asistentes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
