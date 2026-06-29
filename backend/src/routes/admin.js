const express = require("express");
const { requireAuth, requireStaff, requireAdmin } = require("../middleware/auth");
const { Usuario, Evento, Boleto, Venta, Publicacion, Reembolso } = require("../models");
const { requireObjectId } = require("../utils/validate");
const { createDefaultBoletos } = require("../utils/event-boletos");
const { aggregateEventoResumenes, zonasForEvento, boletosPorEstado } = require("../utils/event-stats");
const {
  userObjectId,
  isPlatformAdmin,
  eventCreatorFilter,
  eventIdsForStaff,
  scopedEventIdsFilter,
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
    const ventaScope = await scopedEventIdsFilter(req.user);
    const boletoScope = eventIds ? { evento_id: { $in: eventIds } } : {};

    const [usuarios, eventos, boletos, ventas, publicaciones, reembolsos] = await Promise.all([
      adminView ? Usuario.countDocuments() : Promise.resolve(0),
      Evento.countDocuments(eventoScope),
      eventIds && !eventIds.length
        ? Promise.resolve(0)
        : Boleto.countDocuments(boletoScope),
      Venta.countDocuments({ estado: "confirmada", ...ventaScope }),
      eventIds && !eventIds.length
        ? Promise.resolve(0)
        : Publicacion.countDocuments(
            eventIds ? { evento_id: { $in: eventIds } } : {}
          ),
      Reembolso.countDocuments({
        estado: "procesado",
        ...(eventIds ? { evento_id: { $in: eventIds } } : {}),
      }),
    ]);

    const boletosPorEstado = eventIds && !eventIds.length
      ? []
      : await Boleto.aggregate([
          ...(eventIds ? [{ $match: { evento_id: { $in: eventIds } } }] : []),
          { $group: { _id: "$estado", total: { $sum: 1 } } },
        ]);

    const ingresos = await Venta.aggregate([
      { $match: { estado: "confirmada", ...ventaScope } },
      { $group: { _id: null, total: { $sum: "$monto_total" } } },
    ]);

    const ventasRecientes = await Venta.find({ estado: "confirmada", ...ventaScope })
      .sort({ fecha_venta: -1 })
      .limit(10)
      .lean();

    const usuarioIds = [...new Set(ventasRecientes.map((v) => String(v.usuario_id)))];
    const eventoIdsRecientes = [...new Set(ventasRecientes.map((v) => String(v.evento_id)))];

    const [usuariosMap, eventosMap] = await Promise.all([
      Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo").lean(),
      Evento.find({ _id: { $in: eventoIdsRecientes } }).select("titulo").lean(),
    ]);

    const uMap = Object.fromEntries(usuariosMap.map((u) => [String(u._id), u]));
    const eMap = Object.fromEntries(eventosMap.map((e) => [String(e._id), e]));

    const boletosPorEstadoMap = Object.fromEntries(boletosPorEstado.map((b) => [b._id, b.total]));
    const boletosVendidos = boletosPorEstadoMap.vendido || 0;
    const ingresosBrutos = ingresos[0]?.total || 0;

    const [topEventosAgg, ventasPorMetodo, reembolsosMontoAgg, proximosEventos] = await Promise.all([
      Venta.aggregate([
        { $match: { estado: "confirmada", ...ventaScope } },
        {
          $group: {
            _id: "$evento_id",
            ingresos: { $sum: "$monto_total" },
            ventas: { $sum: 1 },
            entradas: { $sum: { $size: { $ifNull: ["$boletos_ids", []] } } },
          },
        },
        { $sort: { ingresos: -1 } },
        { $limit: 5 },
      ]),
      Venta.aggregate([
        { $match: { estado: "confirmada", ...ventaScope } },
        {
          $group: {
            _id: "$metodo_pago",
            ventas: { $sum: 1 },
            ingresos: { $sum: "$monto_total" },
          },
        },
        { $sort: { ingresos: -1 } },
      ]),
      Reembolso.aggregate([
        {
          $match: {
            estado: "procesado",
            ...(eventIds ? { evento_id: { $in: eventIds } } : {}),
          },
        },
        { $group: { _id: null, total: { $sum: "$monto" } } },
      ]),
      Evento.find(eventoScope)
        .sort({ fecha_evento: 1 })
        .limit(4)
        .select("titulo ciudad fecha_evento estado categoria")
        .lean(),
    ]);

    const topEventoIds = topEventosAgg.map((t) => t._id);
    const topEventosDocs = topEventoIds.length
      ? await Evento.find({ _id: { $in: topEventoIds } }).select("titulo ciudad").lean()
      : [];
    const topEventosMap = Object.fromEntries(topEventosDocs.map((e) => [String(e._id), e]));

    const montoReembolsado = reembolsosMontoAgg[0]?.total || 0;

    res.json({
      scope: adminView ? "admin" : "organizador",
      resumen: {
        usuarios: adminView ? usuarios : null,
        eventos,
        boletos,
        boletos_vendidos: boletosVendidos,
        boletos_disponibles: boletosPorEstadoMap.disponible || 0,
        ocupacion: boletos > 0 ? Math.round((boletosVendidos / boletos) * 100) : 0,
        ventas,
        publicaciones,
        reembolsos,
        ingresos: ingresosBrutos,
        monto_reembolsado: montoReembolsado,
        ingresos_netos: Math.max(0, ingresosBrutos - montoReembolsado),
      },
      boletosPorEstado: boletosPorEstadoMap,
      ventasRecientes: ventasRecientes.map((v) => ({
        ...v,
        entradas: (v.boletos_ids || []).length,
        usuario: uMap[String(v.usuario_id)],
        evento: eMap[String(v.evento_id)],
      })),
      top_eventos: topEventosAgg.map((t) => ({
        evento_id: t._id,
        evento: topEventosMap[String(t._id)] || null,
        ingresos: t.ingresos,
        ventas: t.ventas,
        entradas: t.entradas,
      })),
      ventas_por_metodo: ventasPorMetodo.map((m) => ({
        metodo: m._id || "otro",
        ventas: m.ventas,
        ingresos: m.ingresos,
      })),
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
    const [resumenes, zonas, estados, ventasRecientes, reembolsosRecientes] = await Promise.all([
      aggregateEventoResumenes([eventoId]),
      zonasForEvento(eventoId),
      boletosPorEstado(eventoId),
      Venta.find({ evento_id: eventoId, estado: "confirmada" })
        .sort({ fecha_venta: -1 })
        .limit(8)
        .lean(),
      Reembolso.find({ evento_id: eventoId })
        .sort({ fecha_solicitud: -1 })
        .limit(5)
        .lean(),
    ]);

    const usuarioIds = [
      ...new Set([
        ...ventasRecientes.map((v) => String(v.usuario_id)),
        ...reembolsosRecientes.map((r) => String(r.usuario_id)),
      ]),
    ];
    const usuarios = usuarioIds.length
      ? await Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo").lean()
      : [];
    const uMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));

    res.json({
      evento,
      resumen: resumenes[String(eventoId)] || null,
      zonas: zonas.map((z) => ({
        zona: z._id,
        total: z.total,
        disponibles: z.disponibles,
        vendidos: z.vendidos,
        reservados: z.reservados,
        precio_min: z.precio_min,
        precio_max: z.precio_max,
        ocupacion: z.total ? Math.round((z.vendidos / z.total) * 100) : 0,
      })),
      boletos_por_estado: estados,
      ventas_recientes: ventasRecientes.map((v) => ({
        ...v,
        comprador: uMap[String(v.usuario_id)] || null,
      })),
      reembolsos_recientes: reembolsosRecientes.map((r) => ({
        ...r,
        comprador: uMap[String(r.usuario_id)] || null,
      })),
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post("/eventos", async (req, res) => {
  const { titulo, descripcion, categoria, ciudad, fecha_evento, flyer_url, precio_base } = req.body;

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

    const boletosCreados = await createDefaultBoletos(evento._id, precio_base);

    res.status(201).json({
      ...evento.toObject(),
      boletos_creados: boletosCreados,
      visible_publico: true,
      mensaje: "Evento publicado y visible para todos los usuarios de TicketFlow.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/reembolsos", async (req, res) => {
  try {
    const eventIds = await eventIdsForStaff(req.user);
    const filter = eventIds ? { evento_id: { $in: eventIds } } : {};
    const reembolsos = await Reembolso.find(filter).sort({ fecha_solicitud: -1 }).limit(50).lean();
    const usuarioIds = [...new Set(reembolsos.map((r) => String(r.usuario_id)))];
    const eventoIds = [...new Set(reembolsos.map((r) => String(r.evento_id)))];
    const [usuarios, eventos, resumenRows] = await Promise.all([
      Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo email").lean(),
      Evento.find({ _id: { $in: eventoIds } }).select("titulo ciudad fecha_evento").lean(),
      Reembolso.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$estado",
            cantidad: { $sum: 1 },
            monto: { $sum: "$monto" },
          },
        },
      ]),
    ]);
    const uMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));
    const eMap = Object.fromEntries(eventos.map((e) => [String(e._id), e]));
    const byEstado = Object.fromEntries(resumenRows.map((r) => [r._id, r]));
    res.json({
      resumen: {
        total: resumenRows.reduce((acc, row) => acc + row.cantidad, 0),
        procesados: byEstado.procesado?.cantidad || 0,
        pendientes: byEstado.pendiente?.cantidad || 0,
        monto_total: resumenRows.reduce((acc, row) => acc + row.monto, 0),
        monto_procesado: byEstado.procesado?.monto || 0,
      },
      reembolsos: reembolsos.map((r) => ({
        ...r,
        comprador: uMap[String(r.usuario_id)] || null,
        evento: eMap[String(r.evento_id)] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
