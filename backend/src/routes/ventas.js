const express = require("express");
const { Boleto, Venta, Evento } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { requireObjectId } = require("../utils/validate");

const router = express.Router();

const MAX_BOLETOS_POR_EVENTO = Number(process.env.MAX_BOLETOS_POR_EVENTO || 4);

async function countBoletosUsuarioEvento(usuarioId, eventoId) {
  return Boleto.countDocuments({
    evento_id: eventoId,
    vendido_a: usuarioId,
    estado: "vendido",
  });
}

router.get("/cupo/:eventoId", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.eventoId, "evento_id");
    const comprados = await countBoletosUsuarioEvento(req.user._id, req.params.eventoId);
    const disponibles = Math.max(0, MAX_BOLETOS_POR_EVENTO - comprados);
    res.json({
      maximo: MAX_BOLETOS_POR_EVENTO,
      comprados,
      disponibles,
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.get("/mis-boletos", requireAuth, async (req, res) => {
  try {
    const boletos = await Boleto.find({
      vendido_a: req.user._id,
      estado: "vendido",
    })
      .sort({ fecha_venta: -1 })
      .lean();

    if (!boletos.length) return res.json([]);

    const eventoIds = [...new Set(boletos.map((b) => String(b.evento_id)))];
    const eventos = await Evento.find({ _id: { $in: eventoIds } }).lean();
    const eventosMap = Object.fromEntries(eventos.map((e) => [String(e._id), e]));

    const ventas = await Venta.find({
      usuario_id: req.user._id,
      estado: "confirmada",
    }).lean();

    const ventaPorBoleto = {};
    ventas.forEach((v) => {
      (v.boletos_ids || []).forEach((id) => {
        ventaPorBoleto[String(id)] = v;
      });
    });

    res.json(
      boletos.map((b) => ({
        ...b,
        evento: eventosMap[String(b.evento_id)] || null,
        venta: ventaPorBoleto[String(b._id)] || null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/mias", requireAuth, async (req, res) => {
  try {
    const ventas = await Venta.find({ usuario_id: req.user._id })
      .sort({ fecha_venta: -1 })
      .limit(30)
      .lean();
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function rollbackBoletos(boletoIds) {
  await Boleto.updateMany(
    { _id: { $in: boletoIds }, estado: "vendido" },
    {
      $set: { estado: "disponible" },
      $unset: { vendido_a: "", fecha_venta: "", codigo_entrada: "" },
    }
  );
}

router.post("/", requireAuth, async (req, res) => {
  const { evento_id, boletos_ids, metodo_pago } = req.body;
  const usuario_id = String(req.user._id);

  if (!evento_id || !Array.isArray(boletos_ids) || boletos_ids.length === 0) {
    return res.status(400).json({ error: "Datos de venta incompletos" });
  }

  if (boletos_ids.length > MAX_BOLETOS_POR_EVENTO) {
    return res.status(400).json({
      error: `No puedes comprar mas de ${MAX_BOLETOS_POR_EVENTO} boletos por evento en una sola compra`,
    });
  }

  try {
    requireObjectId(evento_id, "evento_id");
    boletos_ids.forEach((id, i) => requireObjectId(id, `boletos_ids[${i}]`));
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const yaComprados = await countBoletosUsuarioEvento(usuario_id, evento_id);
  if (yaComprados + boletos_ids.length > MAX_BOLETOS_POR_EVENTO) {
    const restantes = Math.max(0, MAX_BOLETOS_POR_EVENTO - yaComprados);
    return res.status(400).json({
      error:
        restantes === 0
          ? `Ya alcanzaste el maximo de ${MAX_BOLETOS_POR_EVENTO} boletos para este evento`
          : `Solo puedes comprar ${restantes} boleto(s) mas para este evento (maximo ${MAX_BOLETOS_POR_EVENTO} por persona)`,
    });
  }

  const ahora = new Date();
  const referencia = `PAY-${Date.now()}`;
  const vendidos = [];
  const vendidosDetalle = [];
  let monto_total = 0;

  try {
    for (const boletoId of boletos_ids) {
      const codigo = `${referencia}-${String(boletoId).slice(-6)}`;
      const boleto = await Boleto.findOneAndUpdate(
        { _id: boletoId, evento_id, estado: "disponible" },
        {
          $set: {
            estado: "vendido",
            vendido_a: usuario_id,
            fecha_venta: ahora,
            codigo_entrada: codigo,
          },
        },
        { new: true }
      );

      if (!boleto) {
        if (vendidos.length) await rollbackBoletos(vendidos);
        return res.status(409).json({ error: "Uno o mas boletos ya no estan disponibles" });
      }

      vendidos.push(boleto._id);
      vendidosDetalle.push(boleto.toObject());
      monto_total += Number(boleto.precio) || 0;
    }

    const venta = await Venta.create({
      usuario_id,
      evento_id,
      boletos_ids,
      monto_total,
      metodo_pago: metodo_pago || "tarjeta",
      estado: "confirmada",
      referencia_pago: referencia,
      fecha_venta: ahora,
    });

    const evento = await Evento.findById(evento_id).lean();

    res.status(201).json({
      venta: venta.toObject(),
      boletos: vendidosDetalle,
      evento,
      maximo_por_evento: MAX_BOLETOS_POR_EVENTO,
      comprados_evento: yaComprados + boletos_ids.length,
    });
  } catch (error) {
    if (vendidos.length) await rollbackBoletos(vendidos);
    res.status(409).json({ error: error.message });
  }
});

module.exports = router;
