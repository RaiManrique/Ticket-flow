const express = require("express");
const mongoose = require("mongoose");
const { Boleto, Venta, Evento, Reembolso } = require("../models");
const { requireAuth, requireStaff } = require("../middleware/auth");
const { requireObjectId } = require("../utils/validate");
const { evaluarReembolso } = require("../data/ticketing");
const { scopedEventIdsFilter } = require("../utils/staff");
const { enrichVentas, ventasResumen } = require("../utils/ventas-panel");

const router = express.Router();

const MAX_BOLETOS_POR_EVENTO = Number(process.env.MAX_BOLETOS_POR_EVENTO || 4);

function userObjectId(user) {
  return new mongoose.Types.ObjectId(String(user._id));
}

async function countBoletosUsuarioEvento(usuarioId, eventoId) {
  return Boleto.countDocuments({
    evento_id: eventoId,
    vendido_a: userObjectId({ _id: usuarioId }),
    estado: "vendido",
  });
}

router.get("/cupo/:eventoId", requireAuth, async (req, res) => {
  try {
    requireObjectId(req.params.eventoId, "evento_id");
    const comprados = await countBoletosUsuarioEvento(userObjectId(req.user), req.params.eventoId);
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

router.get("/mis-reembolsos", requireAuth, async (req, res) => {
  try {
    const usuarioId = userObjectId(req.user);
    const reembolsos = await Reembolso.find({ usuario_id: usuarioId })
      .sort({ fecha_solicitud: -1 })
      .limit(30)
      .lean();

    if (!reembolsos.length) return res.json([]);

    const eventoIds = [...new Set(reembolsos.map((r) => String(r.evento_id)))];
    const eventos = await Evento.find({ _id: { $in: eventoIds } }).lean();
    const eventosMap = Object.fromEntries(eventos.map((e) => [String(e._id), e]));

    res.json(
      reembolsos.map((r) => ({
        ...r,
        evento: eventosMap[String(r.evento_id)] || null,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/mis-boletos", requireAuth, async (req, res) => {
  try {
    const usuarioId = userObjectId(req.user);
    const boletos = await Boleto.find({
      vendido_a: usuarioId,
      estado: "vendido",
    })
      .sort({ fecha_venta: -1 })
      .lean();

    if (!boletos.length) return res.json([]);

    const eventoIds = [...new Set(boletos.map((b) => String(b.evento_id)))];
    const eventos = await Evento.find({ _id: { $in: eventoIds } }).lean();
    const eventosMap = Object.fromEntries(eventos.map((e) => [String(e._id), e]));

    const ventas = await Venta.find({
      usuario_id: usuarioId,
      estado: "confirmada",
    }).lean();

    const ventaPorBoleto = {};
    ventas.forEach((v) => {
      (v.boletos_ids || []).forEach((id) => {
        ventaPorBoleto[String(id)] = v;
      });
    });

    const boletoIds = boletos.map((b) => b._id);
    const reembolsos = await Reembolso.find({
      boleto_id: { $in: boletoIds },
      estado: { $in: ["procesado", "pendiente"] },
    }).lean();
    const reembolsoMap = Object.fromEntries(reembolsos.map((r) => [String(r.boleto_id), r]));

    res.json(
      boletos.map((b) => {
        const evento = eventosMap[String(b.evento_id)] || null;
        const venta = ventaPorBoleto[String(b._id)] || null;
        const reembolso = reembolsoMap[String(b._id)];
        const politica = evaluarReembolso(b, evento, venta);
        return {
          ...b,
          evento,
          venta,
          reembolso,
          reembolso_elegible: politica.elegible && !reembolso,
          reembolso_motivo: reembolso ? "Reembolso ya solicitado" : politica.motivo,
        };
      })
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/mias", requireAuth, async (req, res) => {
  try {
    const ventas = await Venta.find({ usuario_id: userObjectId(req.user) })
      .sort({ fecha_venta: -1 })
      .limit(30)
      .lean();
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/panel", requireAuth, requireStaff, async (req, res) => {
  try {
    const ventaScope = await scopedEventIdsFilter(req.user);
    const ventas = await Venta.find(ventaScope).sort({ fecha_venta: -1 }).limit(50).lean();
    const [resumen, items] = await Promise.all([
      ventasResumen(ventaScope),
      enrichVentas(ventas),
    ]);
    res.json({ resumen, ventas: items });
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
  const usuario_id = userObjectId(req.user);

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

router.post("/reembolso", requireAuth, async (req, res) => {
  const { boleto_id, motivo } = req.body;
  const usuario_id = userObjectId(req.user);

  if (!boleto_id) {
    return res.status(400).json({ error: "boleto_id requerido" });
  }

  try {
    requireObjectId(boleto_id, "boleto_id");
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const motivoTxt = String(motivo || "").trim();
  if (motivoTxt.length < 10) {
    return res.status(400).json({ error: "Describe el motivo del reembolso (min. 10 caracteres)" });
  }

  try {
    const boleto = await Boleto.findOne({
      _id: boleto_id,
      vendido_a: usuario_id,
      estado: "vendido",
    });

    if (!boleto) {
      return res.status(404).json({ error: "Entrada no encontrada o no pertenece a tu cuenta" });
    }

    const existente = await Reembolso.findOne({
      boleto_id,
      estado: { $in: ["pendiente", "procesado"] },
    });
    if (existente) {
      return res.status(409).json({ error: "Ya existe una solicitud de reembolso para esta entrada" });
    }

    const evento = await Evento.findById(boleto.evento_id).lean();
    const venta = await Venta.findOne({
      usuario_id,
      boletos_ids: boleto._id,
      estado: "confirmada",
    }).lean();

    if (!venta) {
      return res.status(404).json({ error: "Venta asociada no encontrada" });
    }

    const politica = evaluarReembolso(boleto, evento, venta);
    if (!politica.elegible) {
      return res.status(400).json({ error: politica.motivo });
    }

    const ahora = new Date();
    const referencia = `REF-${Date.now()}`;
    const monto = Number(boleto.precio) || 0;

    const reembolso = await Reembolso.create({
      usuario_id,
      venta_id: venta._id,
      boleto_id: boleto._id,
      evento_id: boleto.evento_id,
      motivo: motivoTxt,
      monto,
      estado: "procesado",
      referencia,
      fecha_solicitud: ahora,
      fecha_procesado: ahora,
    });

    await Boleto.updateOne(
      { _id: boleto._id },
      {
        $set: { estado: "disponible" },
        $unset: { vendido_a: "", fecha_venta: "", codigo_entrada: "" },
      }
    );

    const boletosVenta = await Boleto.find({
      _id: { $in: venta.boletos_ids },
      vendido_a: usuario_id,
      estado: "vendido",
    });

    if (!boletosVenta.length) {
      await Venta.updateOne({ _id: venta._id }, { $set: { estado: "reembolsada" } });
    }

    res.status(201).json({
      reembolso: reembolso.toObject(),
      mensaje: `Reembolso simulado procesado. Referencia ${referencia}. Monto: S/ ${monto.toFixed(2)}`,
      plazo: politica.plazo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
