const express = require("express");
const { Usuario } = require("../models");
const { createToken, requireAuth } = require("../middleware/auth");

const router = express.Router();
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "TicketFlow2026";

router.post("/login", async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: "Usuario y contrasena requeridos" });
  }

  if (password !== DEMO_PASSWORD) {
    return res.status(401).json({ error: "Contrasena incorrecta" });
  }

  try {
    const user = await Usuario.findOne({
      $or: [{ email: login.toLowerCase() }, { username: login }],
    })
      .select("-password_hash")
      .lean();

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
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
      redirect: ["admin", "organizador"].includes(user.rol) ? "/admin.html" : "/usuario.html",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
