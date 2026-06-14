const express = require("express");
const { requireAuth, requireStaff } = require("../middleware/auth");
const { Usuario, Evento, Boleto, Venta, Publicacion, Reembolso } = require("../models");

const router = express.Router();

router.use(requireAuth, requireStaff);

router.get("/dashboard", async (_req, res) => {
  try {
    const [usuarios, eventos, boletos, ventas, publicaciones, reembolsos] = await Promise.all([
      Usuario.countDocuments(),
      Evento.countDocuments(),
      Boleto.countDocuments(),
      Venta.countDocuments({ estado: "confirmada" }),
      Publicacion.countDocuments(),
      Reembolso.countDocuments({ estado: "procesado" }),
    ]);

    const boletosPorEstado = await Boleto.aggregate([
      { $group: { _id: "$estado", total: { $sum: 1 } } },
    ]);

    const ingresos = await Venta.aggregate([
      { $match: { estado: "confirmada" } },
      { $group: { _id: null, total: { $sum: "$monto_total" } } },
    ]);

    const ventasRecientes = await Venta.find({ estado: "confirmada" })
      .sort({ fecha_venta: -1 })
      .limit(10)
      .lean();

    const usuarioIds = [...new Set(ventasRecientes.map((v) => String(v.usuario_id)))];
    const eventoIds = [...new Set(ventasRecientes.map((v) => String(v.evento_id)))];

    const [usuariosMap, eventosMap] = await Promise.all([
      Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo").lean(),
      Evento.find({ _id: { $in: eventoIds } }).select("titulo").lean(),
    ]);

    const uMap = Object.fromEntries(usuariosMap.map((u) => [String(u._id), u]));
    const eMap = Object.fromEntries(eventosMap.map((e) => [String(e._id), e]));

    res.json({
      resumen: {
        usuarios,
        eventos,
        boletos,
        ventas,
        publicaciones,
        reembolsos,
        ingresos: ingresos[0]?.total || 0,
      },
      boletosPorEstado: Object.fromEntries(boletosPorEstado.map((b) => [b._id, b.total])),
      ventasRecientes: ventasRecientes.map((v) => ({
        ...v,
        usuario: uMap[String(v.usuario_id)],
        evento: eMap[String(v.evento_id)],
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/usuarios", async (_req, res) => {
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

router.get("/eventos", async (_req, res) => {
  try {
    const eventos = await Evento.find().sort({ fecha_evento: 1 }).lean();
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/ventas", async (_req, res) => {
  try {
    const ventas = await Venta.find().sort({ fecha_venta: -1 }).limit(50).lean();
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/reembolsos", async (_req, res) => {
  try {
    const reembolsos = await Reembolso.find().sort({ fecha_solicitud: -1 }).limit(50).lean();
    const usuarioIds = [...new Set(reembolsos.map((r) => String(r.usuario_id)))];
    const eventoIds = [...new Set(reembolsos.map((r) => String(r.evento_id)))];
    const [usuarios, eventos] = await Promise.all([
      Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo").lean(),
      Evento.find({ _id: { $in: eventoIds } }).select("titulo").lean(),
    ]);
    const uMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));
    const eMap = Object.fromEntries(eventos.map((e) => [String(e._id), e]));
    res.json(
      reembolsos.map((r) => ({
        ...r,
        usuario: uMap[String(r.usuario_id)],
        evento: eMap[String(r.evento_id)],
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
