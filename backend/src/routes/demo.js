const express = require("express");
const { Usuario } = require("../models");

const router = express.Router();

router.get("/compradores", async (_req, res) => {
  try {
    const usuarios = await Usuario.find({ rol: "usuario" })
      .select("username nombre_completo")
      .sort({ username: 1 })
      .lean();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
