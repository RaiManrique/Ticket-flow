const express = require("express");
const { POLITICAS, TICKET_VENDOR, REFUND_MAX_DAYS, REFUND_MIN_HOURS_BEFORE_EVENT } = require("../data/ticketing");

const router = express.Router();

router.get("/", (_req, res) => {
  res.json({
    vendedor: TICKET_VENDOR,
    limites: {
      reembolso_max_dias: REFUND_MAX_DAYS,
      reembolso_horas_antes_evento: REFUND_MIN_HOURS_BEFORE_EVENT,
    },
    secciones: POLITICAS,
  });
});

module.exports = router;
