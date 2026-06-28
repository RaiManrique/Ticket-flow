const { Boleto, Venta, Publicacion, Reembolso } = require("../models");

async function aggregateEventoResumenes(eventoIds) {
  if (!eventoIds.length) return {};

  const [boletoStats, ventaStats, pubStats, reembolsoStats] = await Promise.all([
    Boleto.aggregate([
      { $match: { evento_id: { $in: eventoIds } } },
      {
        $group: {
          _id: "$evento_id",
          total_boletos: { $sum: 1 },
          disponibles: { $sum: { $cond: [{ $eq: ["$estado", "disponible"] }, 1, 0] } },
          vendidos: { $sum: { $cond: [{ $eq: ["$estado", "vendido"] }, 1, 0] } },
          reservados: { $sum: { $cond: [{ $eq: ["$estado", "reservado"] }, 1, 0] } },
          precio_minimo: { $min: "$precio" },
          precio_maximo: { $max: "$precio" },
        },
      },
    ]),
    Venta.aggregate([
      { $match: { evento_id: { $in: eventoIds }, estado: "confirmada" } },
      {
        $group: {
          _id: "$evento_id",
          ventas: { $sum: 1 },
          ingresos: { $sum: "$monto_total" },
          entradas_vendidas: { $sum: { $size: { $ifNull: ["$boletos_ids", []] } } },
        },
      },
    ]),
    Publicacion.aggregate([
      { $match: { evento_id: { $in: eventoIds } } },
      { $group: { _id: "$evento_id", publicaciones: { $sum: 1 } } },
    ]),
    Reembolso.aggregate([
      { $match: { evento_id: { $in: eventoIds }, estado: "procesado" } },
      {
        $group: {
          _id: "$evento_id",
          reembolsos: { $sum: 1 },
          monto_reembolsado: { $sum: "$monto" },
        },
      },
    ]),
  ]);

  const resumen = {};
  eventoIds.forEach((id) => {
    const key = String(id);
    resumen[key] = {
      total_boletos: 0,
      disponibles: 0,
      vendidos: 0,
      reservados: 0,
      precio_minimo: null,
      precio_maximo: null,
      ventas: 0,
      ingresos: 0,
      entradas_vendidas: 0,
      publicaciones: 0,
      reembolsos: 0,
      monto_reembolsado: 0,
      ocupacion: 0,
    };
  });

  boletoStats.forEach((row) => {
    const key = String(row._id);
    if (!resumen[key]) return;
    Object.assign(resumen[key], {
      total_boletos: row.total_boletos,
      disponibles: row.disponibles,
      vendidos: row.vendidos,
      reservados: row.reservados,
      precio_minimo: row.precio_minimo ?? null,
      precio_maximo: row.precio_maximo ?? null,
    });
    if (row.total_boletos > 0) {
      resumen[key].ocupacion = Math.round((row.vendidos / row.total_boletos) * 100);
    }
  });

  ventaStats.forEach((row) => {
    const key = String(row._id);
    if (!resumen[key]) return;
    Object.assign(resumen[key], {
      ventas: row.ventas,
      ingresos: row.ingresos,
      entradas_vendidas: row.entradas_vendidas,
    });
  });

  pubStats.forEach((row) => {
    const key = String(row._id);
    if (resumen[key]) resumen[key].publicaciones = row.publicaciones;
  });

  reembolsoStats.forEach((row) => {
    const key = String(row._id);
    if (!resumen[key]) return;
    resumen[key].reembolsos = row.reembolsos;
    resumen[key].monto_reembolsado = row.monto_reembolsado;
  });

  return resumen;
}

async function zonasForEvento(eventoId) {
  return Boleto.aggregate([
    { $match: { evento_id: eventoId } },
    {
      $group: {
        _id: "$zona",
        total: { $sum: 1 },
        disponibles: { $sum: { $cond: [{ $eq: ["$estado", "disponible"] }, 1, 0] } },
        vendidos: { $sum: { $cond: [{ $eq: ["$estado", "vendido"] }, 1, 0] } },
        reservados: { $sum: { $cond: [{ $eq: ["$estado", "reservado"] }, 1, 0] } },
        precio_min: { $min: "$precio" },
        precio_max: { $max: "$precio" },
      },
    },
    { $sort: { precio_min: 1 } },
  ]);
}

async function boletosPorEstado(eventoId) {
  const rows = await Boleto.aggregate([
    { $match: { evento_id: eventoId } },
    { $group: { _id: "$estado", total: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.total]));
}

module.exports = {
  aggregateEventoResumenes,
  zonasForEvento,
  boletosPorEstado,
};
