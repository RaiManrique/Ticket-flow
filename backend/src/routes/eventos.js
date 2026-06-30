const express = require("express");
const { Evento } = require("../models");
const { enrichEvento } = require("../data/ticketing");
const { requireObjectId } = require("../utils/validate");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const eventos = await Evento.find({ estado: { $in: ["publicado", "agotado"] } })
      .sort({ fecha_evento: 1 })
      .lean();
    res.json(eventos.map((e) => enrichEvento(e)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/detalle", async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(enrichEvento(evento));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(enrichEvento(evento));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
