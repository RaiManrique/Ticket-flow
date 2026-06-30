const express = require("express");

const router = express.Router();

router.get("/login-info", (_req, res) => {
  const password = process.env.DEMO_USER_PASSWORD || "TicketFlow2026";
  res.json({
    password,
    accounts: [
      { login: "rai_manrique", rol: "usuario", label: "Usuario" },
      { login: "victor_arapa", rol: "organizador", label: "Organizador" },
      { login: "admin_ticketflow", rol: "admin", label: "Admin" },
    ],
    app_url: "http://127.0.0.1:8090",
  });
});

module.exports = router;
