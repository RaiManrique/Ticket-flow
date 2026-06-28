const express = require("express");
const { Usuario } = require("../models");
const { createToken, requireAuth } = require("../middleware/auth");
const { verifyPassword, hashPassword, isLegacyHash } = require("../utils/passwords");
const { validateRegisterInput } = require("../utils/register");

const router = express.Router();
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "TicketFlow2026";

function publicUser(user) {
  return {
    _id: user._id,
    email: user.email,
    username: user.username,
    nombre_completo: user.nombre_completo,
    rol: user.rol,
    foto_perfil_url: user.foto_perfil_url,
  };
}

router.post("/register", async (req, res) => {
  try {
    const input = validateRegisterInput(req.body);

    const exists = await Usuario.findOne({
      $or: [{ email: input.email }, { username: input.username }],
    }).lean();

    if (exists) {
      if (exists.email === input.email) {
        return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
      }
      return res.status(409).json({ error: "Ese nombre de usuario ya esta en uso" });
    }

    const password_hash = await hashPassword(input.password);
    const user = await Usuario.create({
      email: input.email,
      username: input.username,
      nombre_completo: input.nombre_completo,
      password_hash,
      rol: "usuario",
      foto_perfil_url: "/img/perfiles/rai.jpg",
      fecha_registro: new Date(),
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: publicUser(user.toObject()),
      redirect: "/usuario",
      mensaje: "Cuenta creada correctamente",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email o usuario ya registrado" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(error.status || 500).json({ error: error.message });
  }
});

async function registerStaff(req, res, rol, redirect, mensaje) {
  try {
    const input = validateRegisterInput(req.body);

    const exists = await Usuario.findOne({
      $or: [{ email: input.email }, { username: input.username }],
    }).lean();

    if (exists) {
      if (exists.email === input.email) {
        return res.status(409).json({ error: "Ya existe una cuenta con ese email" });
      }
      return res.status(409).json({ error: "Ese nombre de usuario ya esta en uso" });
    }

    const password_hash = await hashPassword(input.password);
    const user = await Usuario.create({
      email: input.email,
      username: input.username,
      nombre_completo: input.nombre_completo,
      password_hash,
      rol,
      foto_perfil_url: "/img/perfiles/victor.jpg",
      fecha_registro: new Date(),
    });

    const token = createToken(user);

    res.status(201).json({
      token,
      user: publicUser(user.toObject()),
      redirect,
      mensaje,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email o usuario ya registrado" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.post("/register-organizer", (req, res) =>
  registerStaff(
    req,
    res,
    "organizador",
    "/admin",
    "Cuenta de organizador creada. Ya puedes gestionar tus eventos."
  )
);

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
      user: publicUser(user),
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
