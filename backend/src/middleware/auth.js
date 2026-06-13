const jwt = require("jsonwebtoken");
const { Usuario } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "ticketflow-dev-secret-cambiar-en-produccion";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";

function createToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      rol: user.rol,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function parseToken(header) {
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  const payload = parseToken(req.headers.authorization);
  if (!payload?.id) {
    return res.status(401).json({ error: "Sesion invalida o expirada" });
  }

  const user = await Usuario.findById(payload.id).select("-password_hash").lean();
  if (!user) return res.status(401).json({ error: "Usuario no encontrado" });

  req.user = user;
  next();
}

function requireStaff(req, res, next) {
  if (!["admin", "organizador"].includes(req.user.rol)) {
    return res.status(403).json({ error: "Acceso solo para administradores u organizadores" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ error: "Acceso solo para administradores" });
  }
  next();
}

module.exports = {
  createToken,
  parseToken,
  requireAuth,
  requireStaff,
  requireAdmin,
  JWT_SECRET,
};
