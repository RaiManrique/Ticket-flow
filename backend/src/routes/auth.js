const express = require("express");
const { Usuario } = require("../models");
const { createToken, requireAuth } = require("../middleware/auth");
const { verifyPassword, hashPassword, isLegacyHash } = require("../utils/passwords");

const router = express.Router();
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "TicketFlow2026";

router.post("/login", async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: "Usuario y contrasena requeridos" });
  }

  try {
    const user = await Usuario.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login }],
    }).lean();

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    const valid = await verifyPassword(password, user.password_hash, DEMO_PASSWORD);
    if (!valid) {
      return res.status(401).json({ error: "Contrasena incorrecta" });
    }

    if (isLegacyHash(user.password_hash)) {
      await Usuario.updateOne(
        { _id: user._id },
        { $set: { password_hash: await hashPassword(password) } }
      );
    }

    const token = createToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        nombre_completo: user.nombre_completo,
        rol: user.rol,
        foto_perfil_url: user.foto_perfil_url,
      },
      redirect: ["admin", "organizador"].includes(user.rol) ? "/admin" : "/usuario",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
