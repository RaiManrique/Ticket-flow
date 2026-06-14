const express = require("express");
const { Evento, Boleto } = require("../models");
const { enrichEvento } = require("../data/ticketing");
const { requireObjectId } = require("../utils/validate");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const eventos = await Evento.find({ estado: "publicado" })
      .sort({ fecha_evento: 1 })
      .lean();

    const ids = eventos.map((e) => e._id);
    const stats = await Boleto.aggregate([
      { $match: { evento_id: { $in: ids } } },
      {
        $group: {
          _id: "$evento_id",
          precio_minimo: { $min: "$precio" },
          precio_maximo: { $max: "$precio" },
          boletos_disponibles: {
            $sum: { $cond: [{ $eq: ["$estado", "disponible"] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = Object.fromEntries(stats.map((s) => [String(s._id), s]));
    const enriched = eventos.map((e) => {
      const s = statsMap[String(e._id)] || {};
      return {
        ...e,
        precio_minimo: s.precio_minimo ?? null,
        precio_maximo: s.precio_maximo ?? null,
        boletos_disponibles: s.boletos_disponibles ?? 0,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/detalle", async (req, res) => {
  try {
    requireObjectId(req.params.id, "evento_id");
    const evento = await Evento.findById(req.params.id).lean();
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    const zonas = await Boleto.aggregate([
      { $match: { evento_id: evento._id } },
      {
        $group: {
          _id: "$zona",
          precio_min: { $min: "$precio" },
          precio_max: { $max: "$precio" },
          disponibles: {
            $sum: { $cond: [{ $eq: ["$estado", "disponible"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { precio_min: 1 } },
    ]);

    const totales = await Boleto.aggregate([
      { $match: { evento_id: evento._id } },
      {
        $group: {
          _id: null,
          precio_minimo: { $min: "$precio" },
          precio_maximo: { $max: "$precio" },
          boletos_disponibles: {
            $sum: { $cond: [{ $eq: ["$estado", "disponible"] }, 1, 0] },
          },
        },
      },
    ]);

    const t = totales[0] || {};

    res.json({
      ...enrichEvento(evento),
      estadisticas: {
        precio_minimo: t.precio_minimo ?? null,
        precio_maximo: t.precio_maximo ?? null,
        boletos_disponibles: t.boletos_disponibles ?? 0,
        zonas: zonas.map((z) => ({
          zona: z._id,
          precio_min: z.precio_min,
          precio_max: z.precio_max,
          disponibles: z.disponibles,
          total: z.total,
        })),
      },
    });
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
