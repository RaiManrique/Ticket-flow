const { Usuario, Evento, Venta } = require("../models");

async function enrichVentas(ventas) {
  if (!ventas.length) return [];
  const usuarioIds = [...new Set(ventas.map((v) => String(v.usuario_id)))];
  const eventoIds = [...new Set(ventas.map((v) => String(v.evento_id)))];
  const [usuarios, eventos] = await Promise.all([
    Usuario.find({ _id: { $in: usuarioIds } }).select("username nombre_completo email").lean(),
    Evento.find({ _id: { $in: eventoIds } }).select("titulo ciudad fecha_evento categoria").lean(),
  ]);
  const uMap = Object.fromEntries(usuarios.map((u) => [String(u._id), u]));
  const eMap = Object.fromEntries(eventos.map((e) => [String(e._id), e]));
  return ventas.map((v) => ({
    ...v,
    entradas: (v.boletos_ids || []).length,
    comprador: uMap[String(v.usuario_id)] || null,
    evento: eMap[String(v.evento_id)] || null,
  }));
}

async function ventasResumen(ventaScope) {
  const rows = await Venta.aggregate([
    { $match: ventaScope },
    {
      $group: {
        _id: "$estado",
        cantidad: { $sum: 1 },
        ingresos: { $sum: "$monto_total" },
        entradas: { $sum: { $size: { $ifNull: ["$boletos_ids", []] } } },
      },
    },
  ]);
  const byEstado = Object.fromEntries(rows.map((r) => [r._id, r]));
  return {
    total: rows.reduce((acc, row) => acc + row.cantidad, 0),
    confirmadas: byEstado.confirmada?.cantidad || 0,
    reembolsadas: byEstado.reembolsada?.cantidad || 0,
    ingresos: byEstado.confirmada?.ingresos || 0,
    entradas_vendidas: byEstado.confirmada?.entradas || 0,
  };
}

module.exports = { enrichVentas, ventasResumen };
