const express = require("express");
const mongoose = require("mongoose");
const { Boleto, Venta } = require("../models");

const router = express.Router();

router.post("/", async (req, res) => {
  const { usuario_id, evento_id, boletos_ids, metodo_pago } = req.body;

  if (!usuario_id || !evento_id || !Array.isArray(boletos_ids) || boletos_ids.length === 0) {
    return res.status(400).json({ error: "Datos de venta incompletos" });
  }

  const session = await mongoose.startSession();

  try {
    let ventaCreada;

    await session.withTransaction(async () => {
      const boletos = await Boleto.find({
        _id: { $in: boletos_ids },
        evento_id,
        estado: "disponible",
      }).session(session);

      if (boletos.length !== boletos_ids.length) {
        throw new Error("Uno o mas boletos ya no estan disponibles");
      }

      const monto_total = boletos.reduce((sum, b) => sum + Number(b.precio), 0);
      const ahora = new Date();
      const referencia = `PAY-${Date.now()}`;

      for (const boleto of boletos) {
        await Boleto.updateOne(
          { _id: boleto._id },
          {
            $set: {
              estado: "vendido",
              vendido_a: usuario_id,
              fecha_venta: ahora,
              codigo_entrada: `${referencia}-${String(boleto._id).slice(-6)}`,
            },
          },
          { session }
        );
      }

      const [venta] = await Venta.create(
        [
          {
            usuario_id,
            evento_id,
            boletos_ids,
            monto_total,
            metodo_pago: metodo_pago || "tarjeta",
            estado: "confirmada",
            referencia_pago: referencia,
            fecha_venta: ahora,
          },
        ],
        { session }
      );

      ventaCreada = venta;
    });

    res.status(201).json(ventaCreada);
  } catch (error) {
    res.status(409).json({ error: error.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;
