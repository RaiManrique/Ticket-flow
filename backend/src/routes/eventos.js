const express = require("express");
const { Evento, Boleto } = require("../models");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const eventos = await Evento.find({ estado: "publicado" })
      .sort({ fecha_evento: 1 })
      .lean();
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });
    res.json(evento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/boletos", async (req, res) => {
  try {
    const boletos = await Boleto.find({ evento_id: req.params.id })
      .sort({ zona: 1, precio: 1 })
      .lean();
    res.json(boletos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
