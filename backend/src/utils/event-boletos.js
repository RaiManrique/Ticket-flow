const { Boleto } = require("../models");

const DEFAULT_ZONES = [
  { zona: "General", fila: "G-A", asientos: 24, precio: 80 },
  { zona: "Platea", fila: "P-A", asientos: 16, precio: 120 },
  { zona: "VIP", fila: "V-A", asientos: 10, precio: 180 },
];

async function createDefaultBoletos(eventoId, precioBase) {
  const base = Number(precioBase);
  const docs = [];

  DEFAULT_ZONES.forEach((zone, index) => {
    const precio = Number.isFinite(base) && base > 0 ? base * (1 + index * 0.35) : zone.precio;
    for (let seat = 1; seat <= zone.asientos; seat += 1) {
      docs.push({
        evento_id: eventoId,
        zona: zone.zona,
        fila: zone.fila,
        asiento: String(seat),
        precio: Math.round(precio * 100) / 100,
        estado: "disponible",
      });
    }
  });

  if (!docs.length) return 0;
  await Boleto.insertMany(docs);
  return docs.length;
}

module.exports = { createDefaultBoletos };
